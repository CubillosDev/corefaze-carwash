-- ============================================================
-- Caja del lavadero (diseño del panel, módulo Caja; ver ADR 0007).
--
-- Una caja por jornada. Se abre con una base en efectivo, recibe los cobros
-- de las órdenes terminadas (el cobro es la entrega: terminada -> entregada,
-- la misma transición de transicionesOrden) y los egresos, y se cierra con un
-- arqueo: efectivo esperado contra efectivo contado.
--
-- Sin descuentos ni propinas: el valor de la orden lo fija el servidor (R4).
-- ============================================================

-- ------------------------------------------------------------
-- Hora de entrega de cada orden
-- ------------------------------------------------------------
alter table public.ordenes_lavado add column entregada_en timestamptz;

comment on column public.ordenes_lavado.entregada_en is
  'Cuándo pasó la orden a entregada. La asigna marcar_entrega_orden(); nadie la escribe directamente.';

create function public.marcar_entrega_orden()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.estado = 'entregada' and old.estado <> 'entregada' then
    new.entregada_en := now();
  end if;
  return new;
end;
$$;

comment on function public.marcar_entrega_orden() is
  'Trigger BEFORE UPDATE de ordenes_lavado: fija entregada_en en el momento en que la orden pasa a entregada.';

revoke execute on function public.marcar_entrega_orden() from public, anon, authenticated;

create trigger trg_ordenes_lavado_marcar_entrega
  before update on public.ordenes_lavado
  for each row execute function public.marcar_entrega_orden();

-- ------------------------------------------------------------
-- Cajas
-- ------------------------------------------------------------
create table public.cajas (
  id bigint generated always as identity,
  jornada_id bigint not null,
  base_inicial integer not null,
  estado text not null default 'abierta',
  abierta_por bigint not null,
  abierta_en timestamptz not null default now(),
  cerrada_por bigint,
  cerrada_en timestamptz,
  efectivo_esperado integer,
  efectivo_contado integer,
  diferencia integer generated always as (efectivo_contado - efectivo_esperado) stored,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint cajas_pkey primary key (id),
  constraint cajas_jornada_id_key unique (jornada_id),
  constraint cajas_jornada_id_fkey foreign key (jornada_id)
    references public.jornadas (id) on delete restrict,
  constraint cajas_abierta_por_fkey foreign key (abierta_por)
    references public.usuarios (id) on delete restrict,
  constraint cajas_cerrada_por_fkey foreign key (cerrada_por)
    references public.usuarios (id) on delete restrict,
  constraint cajas_base_inicial_check check (base_inicial between 0 and 10000000),
  constraint cajas_estado_check check (estado in ('abierta', 'cerrada')),
  constraint cajas_efectivo_contado_check check (efectivo_contado is null or efectivo_contado between 0 and 100000000),
  constraint cajas_cierre_check check (
    (estado = 'cerrada') = (
      cerrada_en is not null and cerrada_por is not null
      and efectivo_esperado is not null and efectivo_contado is not null
    )
  )
);

create unique index idx_cajas_una_abierta on public.cajas ((true)) where estado = 'abierta';
create index idx_cajas_abierta_por on public.cajas (abierta_por);
create index idx_cajas_cerrada_por on public.cajas (cerrada_por);

comment on table public.cajas is 'Caja de una jornada: base inicial, estado y arqueo del cierre.';
comment on index public.idx_cajas_una_abierta is 'Solo puede haber una caja abierta a la vez.';

create trigger trg_cajas_actualizado_en
  before update on public.cajas
  for each row execute function public.asignar_actualizado_en();

create trigger trg_cajas_sin_eliminar
  before delete on public.cajas
  for each row execute function public.impedir_eliminacion('Una caja no se elimina');

create trigger trg_cajas_auditoria
  after insert or update or delete on public.cajas
  for each row execute function public.registrar_auditoria();

-- ------------------------------------------------------------
-- Egresos de caja
-- ------------------------------------------------------------
create table public.egresos_caja (
  id bigint generated always as identity,
  caja_id bigint not null,
  categoria text not null,
  concepto varchar(255),
  valor integer not null,
  registrado_por bigint not null,
  creado_en timestamptz not null default now(),
  constraint egresos_caja_pkey primary key (id),
  constraint egresos_caja_caja_id_fkey foreign key (caja_id)
    references public.cajas (id) on delete restrict,
  constraint egresos_caja_registrado_por_fkey foreign key (registrado_por)
    references public.usuarios (id) on delete restrict,
  constraint egresos_caja_categoria_check
    check (categoria in ('insumos', 'almuerzos', 'servicios_publicos', 'otros')),
  constraint egresos_caja_valor_check check (valor between 1 and 10000000)
);

create index idx_egresos_caja_caja_id on public.egresos_caja (caja_id);
create index idx_egresos_caja_registrado_por on public.egresos_caja (registrado_por);

comment on table public.egresos_caja is 'Salidas de efectivo de la caja. Inmutables: un error se corrige con otro movimiento.';

create trigger trg_egresos_caja_sin_modificar
  before update on public.egresos_caja
  for each row execute function public.impedir_modificacion('Un egreso de caja no se modifica');

create trigger trg_egresos_caja_sin_eliminar
  before delete on public.egresos_caja
  for each row execute function public.impedir_eliminacion('Un egreso de caja no se elimina');

create trigger trg_egresos_caja_auditoria
  after insert or update or delete on public.egresos_caja
  for each row execute function public.registrar_auditoria();

-- ------------------------------------------------------------
-- Cobros de caja: uno por orden
-- ------------------------------------------------------------
create table public.cobros_caja (
  id bigint generated always as identity,
  orden_id bigint not null,
  caja_id bigint not null,
  medio_pago text not null,
  valor integer not null,
  recibido integer,
  cambio integer,
  registrado_por bigint not null,
  creado_en timestamptz not null default now(),
  constraint cobros_caja_pkey primary key (id),
  constraint cobros_caja_orden_id_key unique (orden_id),
  constraint cobros_caja_orden_id_fkey foreign key (orden_id)
    references public.ordenes_lavado (id) on delete restrict,
  constraint cobros_caja_caja_id_fkey foreign key (caja_id)
    references public.cajas (id) on delete restrict,
  constraint cobros_caja_registrado_por_fkey foreign key (registrado_por)
    references public.usuarios (id) on delete restrict,
  constraint cobros_caja_medio_pago_check check (
    medio_pago in ('efectivo', 'nequi', 'daviplata', 'bancolombia', 'datafono', 'credito')
  ),
  constraint cobros_caja_valor_check check (valor > 0),
  constraint cobros_caja_efectivo_check check (
    (recibido is null and cambio is null)
    or (medio_pago = 'efectivo' and recibido >= valor and cambio = recibido - valor)
  )
);

create index idx_cobros_caja_caja_id on public.cobros_caja (caja_id);
create index idx_cobros_caja_registrado_por on public.cobros_caja (registrado_por);

comment on table public.cobros_caja is
  'Cobro de una orden en la caja: medio, valor (el de la orden), efectivo recibido y cambio. Inmutable.';

create trigger trg_cobros_caja_sin_modificar
  before update on public.cobros_caja
  for each row execute function public.impedir_modificacion('Un cobro de caja no se modifica');

create trigger trg_cobros_caja_sin_eliminar
  before delete on public.cobros_caja
  for each row execute function public.impedir_eliminacion('Un cobro de caja no se elimina');

create trigger trg_cobros_caja_auditoria
  after insert or update or delete on public.cobros_caja
  for each row execute function public.registrar_auditoria();

-- ------------------------------------------------------------
-- RLS: consultar para los roles que operan; escribir solo vía las funciones
-- ------------------------------------------------------------
alter table public.cajas enable row level security;
alter table public.egresos_caja enable row level security;
alter table public.cobros_caja enable row level security;
revoke all on table public.cajas, public.egresos_caja, public.cobros_caja from anon, authenticated;
grant select on public.cajas, public.egresos_caja, public.cobros_caja to authenticated;

create policy cajas_select_superadmin_administrador_soporte
  on public.cajas for select to authenticated
  using ((select public.rol_actual()) = any (array['superadmin', 'administrador', 'soporte']));
create policy egresos_caja_select_superadmin_administrador_soporte
  on public.egresos_caja for select to authenticated
  using ((select public.rol_actual()) = any (array['superadmin', 'administrador', 'soporte']));
create policy cobros_caja_select_superadmin_administrador_soporte
  on public.cobros_caja for select to authenticated
  using ((select public.rol_actual()) = any (array['superadmin', 'administrador', 'soporte']));

-- ------------------------------------------------------------
-- Funciones de escritura (solo service_role)
-- ------------------------------------------------------------

-- Abre la caja de la jornada abierta con su base en efectivo.
create function public.abrir_caja(p_base_inicial integer, p_usuario_id bigint)
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  v_jornada_id bigint;
  v_caja_id bigint;
begin
  select id into v_jornada_id from public.jornadas where estado = 'abierta';
  if not found then
    raise exception 'Abre la jornada antes de abrir la caja' using errcode = 'check_violation';
  end if;

  if exists (select 1 from public.cajas where jornada_id = v_jornada_id) then
    raise exception 'La caja de esta jornada ya se abrió' using errcode = 'unique_violation';
  end if;

  insert into public.cajas (jornada_id, base_inicial, abierta_por)
  values (v_jornada_id, p_base_inicial, p_usuario_id)
  returning id into v_caja_id;

  return v_caja_id;
end;
$$;

-- Registra un egreso en la caja abierta.
create function public.registrar_egreso_caja(
  p_categoria text,
  p_concepto varchar(255),
  p_valor integer,
  p_usuario_id bigint
)
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  v_caja_id bigint;
  v_egreso_id bigint;
begin
  select id into v_caja_id from public.cajas where estado = 'abierta' for update;
  if not found then
    raise exception 'La caja está cerrada: ábrela para registrar egresos' using errcode = 'check_violation';
  end if;

  insert into public.egresos_caja (caja_id, categoria, concepto, valor, registrado_por)
  values (v_caja_id, p_categoria, nullif(btrim(p_concepto), ''), p_valor, p_usuario_id)
  returning id into v_egreso_id;

  return v_egreso_id;
end;
$$;

-- Cobra y entrega una orden terminada en la caja abierta. A crédito exige la
-- empresa (activa y con crédito, R8) y el número de vale; en efectivo puede
-- registrar el valor recibido y calcula el cambio.
create function public.registrar_cobro(
  p_orden_id bigint,
  p_medio_pago text,
  p_recibido integer,
  p_cliente_id bigint,
  p_numero_vale varchar(30),
  p_usuario_id bigint
)
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  v_orden public.ordenes_lavado;
  v_caja_id bigint;
  v_cobro_id bigint;
  v_vale text := upper(btrim(coalesce(p_numero_vale, '')));
begin
  select * into v_orden from public.ordenes_lavado where id = p_orden_id for update;
  if not found then
    raise exception 'La orden % no existe', p_orden_id using errcode = 'no_data_found';
  end if;

  if v_orden.estado <> 'terminada' then
    raise exception 'Solo se cobra una orden terminada' using errcode = 'check_violation';
  end if;

  select id into v_caja_id from public.cajas where estado = 'abierta' for update;
  if not found then
    raise exception 'La caja está cerrada: ábrela para registrar cobros' using errcode = 'check_violation';
  end if;

  if p_medio_pago = 'credito' then
    if p_cliente_id is null or v_vale = '' then
      raise exception 'Un cobro a crédito exige la empresa y el número de vale' using errcode = 'check_violation';
    end if;
    if not exists (
      select 1 from public.clientes
      where id = p_cliente_id and estado = 'activo' and credito_habilitado
    ) then
      raise exception 'La empresa no está activa o no tiene crédito habilitado' using errcode = 'check_violation';
    end if;
  elsif p_cliente_id is not null or v_vale <> '' then
    raise exception 'Solo un cobro a crédito lleva empresa y vale' using errcode = 'check_violation';
  end if;

  if p_recibido is not null then
    if p_medio_pago <> 'efectivo' then
      raise exception 'Solo un cobro en efectivo registra el valor recibido' using errcode = 'check_violation';
    end if;
    if p_recibido < v_orden.valor then
      raise exception 'El valor recibido no alcanza para el total' using errcode = 'check_violation';
    end if;
  end if;

  update public.ordenes_lavado
  set medio_pago = p_medio_pago,
      cliente_id = case when p_medio_pago = 'credito' then p_cliente_id end,
      estado = 'entregada'
  where id = p_orden_id;

  if p_medio_pago = 'credito' then
    insert into public.vales_credito (orden_id, cliente_id, numero, creado_por)
    values (p_orden_id, p_cliente_id, v_vale, p_usuario_id);
  end if;

  insert into public.cobros_caja (orden_id, caja_id, medio_pago, valor, recibido, cambio, registrado_por)
  values (
    p_orden_id, v_caja_id, p_medio_pago, v_orden.valor, p_recibido,
    case when p_recibido is not null then p_recibido - v_orden.valor end,
    p_usuario_id
  )
  returning id into v_cobro_id;

  return v_cobro_id;
end;
$$;

-- Cierra la caja abierta con el arqueo: esperado = base + cobros en efectivo − egresos.
create function public.cerrar_caja(p_efectivo_contado integer, p_usuario_id bigint)
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  v_caja public.cajas;
  v_esperado integer;
begin
  select * into v_caja from public.cajas where estado = 'abierta' for update;
  if not found then
    raise exception 'No hay una caja abierta para cerrar' using errcode = 'check_violation';
  end if;

  v_esperado := v_caja.base_inicial
    + coalesce((select sum(valor) from public.cobros_caja where caja_id = v_caja.id and medio_pago = 'efectivo'), 0)
    - coalesce((select sum(valor) from public.egresos_caja where caja_id = v_caja.id), 0);

  update public.cajas
  set estado = 'cerrada',
      cerrada_en = now(),
      cerrada_por = p_usuario_id,
      efectivo_esperado = v_esperado,
      efectivo_contado = p_efectivo_contado
  where id = v_caja.id;

  return v_caja.id;
end;
$$;

-- Reabre una caja cerrada (por ejemplo, si se cerró antes de tiempo). El
-- arqueo anterior queda en la auditoría.
create function public.reabrir_caja(p_caja_id bigint)
returns bigint
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.cajas where id = p_caja_id and estado = 'cerrada') then
    raise exception 'Solo se reabre una caja cerrada' using errcode = 'check_violation';
  end if;

  update public.cajas
  set estado = 'abierta',
      cerrada_en = null,
      cerrada_por = null,
      efectivo_esperado = null,
      efectivo_contado = null
  where id = p_caja_id;

  return p_caja_id;
end;
$$;

comment on function public.abrir_caja(integer, bigint) is 'Abre la caja de la jornada abierta con su base en efectivo.';
comment on function public.registrar_egreso_caja(text, varchar, integer, bigint) is 'Registra una salida de efectivo en la caja abierta.';
comment on function public.registrar_cobro(bigint, text, integer, bigint, varchar, bigint) is
  'Todo o nada: cobra y entrega una orden terminada en la caja abierta (terminada -> entregada), guarda el medio y, a crédito, la empresa y el vale.';
comment on function public.cerrar_caja(integer, bigint) is 'Cierra la caja abierta con el arqueo (esperado contra contado).';
comment on function public.reabrir_caja(bigint) is 'Reabre una caja cerrada; el arqueo anterior y quién la reabrió quedan en la auditoría.';

revoke execute on function public.abrir_caja(integer, bigint) from public, anon, authenticated;
revoke execute on function public.registrar_egreso_caja(text, varchar, integer, bigint) from public, anon, authenticated;
revoke execute on function public.registrar_cobro(bigint, text, integer, bigint, varchar, bigint) from public, anon, authenticated;
revoke execute on function public.cerrar_caja(integer, bigint) from public, anon, authenticated;
revoke execute on function public.reabrir_caja(bigint) from public, anon, authenticated;
grant execute on function public.abrir_caja(integer, bigint) to service_role;
grant execute on function public.registrar_egreso_caja(text, varchar, integer, bigint) to service_role;
grant execute on function public.registrar_cobro(bigint, text, integer, bigint, varchar, bigint) to service_role;
grant execute on function public.cerrar_caja(integer, bigint) to service_role;
grant execute on function public.reabrir_caja(bigint) to service_role;
