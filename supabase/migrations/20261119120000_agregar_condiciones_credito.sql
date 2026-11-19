-- ============================================================
-- Crédito empresarial según el diseño del panel (docs/diseno, módulo
-- Crédito), decisión de producto del 2026-11-19: cupo, día de corte,
-- contacto, vales por servicio y medio de pago del pago.
--
-- Amplía el ADR 0005 (que dejaba el crédito sin vales, cupo ni corte); ver
-- ADR 0007. El pago sigue siendo de órdenes completas vía
-- registrar_pago_credito(): esta migración solo lo envuelve.
-- ============================================================

-- ------------------------------------------------------------
-- Condiciones de crédito de la empresa
-- ------------------------------------------------------------
alter table public.clientes
  add column cupo_credito integer,
  add column dia_corte smallint,
  add column contacto varchar(100);

alter table public.clientes
  add constraint clientes_cupo_credito_check
    check (cupo_credito is null or cupo_credito between 1 and 1000000000),
  add constraint clientes_dia_corte_check
    check (dia_corte is null or dia_corte between 1 and 31),
  add constraint clientes_contacto_check
    check (contacto is null or char_length(btrim(contacto)) between 3 and 100),
  add constraint clientes_condiciones_credito_check
    check ((cupo_credito is null and dia_corte is null) or tipo = 'empresa');

comment on column public.clientes.cupo_credito is
  'Cupo de crédito de la empresa en pesos. Es un tope de referencia: superarlo avisa, no bloquea (diseño del panel).';
comment on column public.clientes.dia_corte is
  'Día del mes en que se corta la cuenta de crédito de la empresa (1–31; 31 = fin de mes).';
comment on column public.clientes.contacto is 'Persona de contacto de la empresa para el crédito.';

-- ------------------------------------------------------------
-- Vales de crédito: un vale por orden a crédito
-- ------------------------------------------------------------
create table public.vales_credito (
  id bigint generated always as identity,
  orden_id bigint not null,
  cliente_id bigint not null,
  numero varchar(30) not null,
  verificado_en timestamptz,
  verificado_por bigint,
  creado_por bigint not null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint vales_credito_pkey primary key (id),
  constraint vales_credito_orden_id_key unique (orden_id),
  constraint vales_credito_numero_key unique (numero),
  constraint vales_credito_orden_id_fkey foreign key (orden_id)
    references public.ordenes_lavado (id) on delete restrict,
  constraint vales_credito_cliente_id_fkey foreign key (cliente_id)
    references public.clientes (id) on delete restrict,
  constraint vales_credito_verificado_por_fkey foreign key (verificado_por)
    references public.usuarios (id) on delete restrict,
  constraint vales_credito_creado_por_fkey foreign key (creado_por)
    references public.usuarios (id) on delete restrict,
  constraint vales_credito_numero_check
    check (numero = upper(btrim(numero)) and char_length(numero) between 3 and 30),
  constraint vales_credito_verificacion_check
    check ((verificado_en is null) = (verificado_por is null))
);

create index idx_vales_credito_cliente_id on public.vales_credito (cliente_id);
create index idx_vales_credito_verificado_por on public.vales_credito (verificado_por);
create index idx_vales_credito_creado_por on public.vales_credito (creado_por);

comment on table public.vales_credito is
  'Vale físico que la empresa entrega por cada servicio a crédito. Se verifica al recibirlo; solo se pagan órdenes con el vale verificado.';

create trigger trg_vales_credito_actualizado_en
  before update on public.vales_credito
  for each row execute function public.asignar_actualizado_en();

-- Al crear el vale, la orden debe ser a crédito y de esa misma empresa.
-- Después solo cambia la verificación, y nunca si la orden ya se pagó.
create function public.proteger_vale_credito()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_orden record;
begin
  select medio_pago, cliente_id, pago_credito_id into v_orden
  from public.ordenes_lavado
  where id = new.orden_id;

  if tg_op = 'INSERT' then
    if v_orden.medio_pago is distinct from 'credito' or v_orden.cliente_id is distinct from new.cliente_id then
      raise exception 'El vale debe ser de una orden a crédito de esa misma empresa'
        using errcode = 'check_violation';
    end if;
    return new;
  end if;

  if new.orden_id <> old.orden_id or new.cliente_id <> old.cliente_id or new.numero <> old.numero
     or new.creado_por <> old.creado_por or new.creado_en <> old.creado_en then
    raise exception 'De un vale solo cambia su verificación' using errcode = 'check_violation';
  end if;

  if v_orden.pago_credito_id is not null then
    raise exception 'El vale de una orden ya pagada no cambia' using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

revoke execute on function public.proteger_vale_credito() from public, anon, authenticated;

create trigger trg_vales_credito_proteger
  before insert or update on public.vales_credito
  for each row execute function public.proteger_vale_credito();

create trigger trg_vales_credito_sin_eliminar
  before delete on public.vales_credito
  for each row execute function public.impedir_eliminacion('Un vale de crédito no se elimina');

create trigger trg_vales_credito_auditoria
  after insert or update or delete on public.vales_credito
  for each row execute function public.registrar_auditoria();

alter table public.vales_credito enable row level security;
revoke all on table public.vales_credito from anon, authenticated;
grant select on public.vales_credito to authenticated;

create policy vales_credito_select_superadmin_administrador_soporte
  on public.vales_credito for select to authenticated
  using ((select public.rol_actual()) = any (array['superadmin', 'administrador', 'soporte']));

-- ------------------------------------------------------------
-- Medio con que se pagó cada pago de crédito
-- ------------------------------------------------------------
create table public.detalles_pago_credito (
  id bigint generated always as identity,
  pago_credito_id bigint not null,
  medio text not null,
  registrado_por bigint not null,
  creado_en timestamptz not null default now(),
  constraint detalles_pago_credito_pkey primary key (id),
  constraint detalles_pago_credito_pago_credito_id_key unique (pago_credito_id),
  constraint detalles_pago_credito_pago_credito_id_fkey foreign key (pago_credito_id)
    references public.pagos_credito (id) on delete restrict,
  constraint detalles_pago_credito_registrado_por_fkey foreign key (registrado_por)
    references public.usuarios (id) on delete restrict,
  constraint detalles_pago_credito_medio_check check (medio in ('transferencia', 'cheque', 'efectivo'))
);

create index idx_detalles_pago_credito_registrado_por on public.detalles_pago_credito (registrado_por);

comment on table public.detalles_pago_credito is
  'Cómo pagó la empresa cada pago de crédito (transferencia, cheque o efectivo). Inmutable, como pagos_credito.';

create trigger trg_detalles_pago_credito_sin_modificar
  before update on public.detalles_pago_credito
  for each row execute function public.impedir_modificacion('El detalle de un pago de crédito no se modifica');

create trigger trg_detalles_pago_credito_sin_eliminar
  before delete on public.detalles_pago_credito
  for each row execute function public.impedir_eliminacion('El detalle de un pago de crédito no se elimina');

create trigger trg_detalles_pago_credito_auditoria
  after insert or update or delete on public.detalles_pago_credito
  for each row execute function public.registrar_auditoria();

alter table public.detalles_pago_credito enable row level security;
revoke all on table public.detalles_pago_credito from anon, authenticated;
grant select on public.detalles_pago_credito to authenticated;

create policy detalles_pago_credito_select_superadmin_administrador_soporte
  on public.detalles_pago_credito for select to authenticated
  using ((select public.rol_actual()) = any (array['superadmin', 'administrador', 'soporte']));

-- Paga órdenes completas con registrar_pago_credito() (ADR 0005) y guarda
-- el medio. Exige, como el diseño, que todas tengan el vale verificado.
create function public.registrar_pago_credito_con_medio(
  p_cliente_id bigint,
  p_orden_ids bigint[],
  p_usuario_id bigint,
  p_medio text
)
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  v_pago_id bigint;
begin
  if p_medio is null or p_medio not in ('transferencia', 'cheque', 'efectivo') then
    raise exception 'El medio del pago debe ser transferencia, cheque o efectivo' using errcode = 'check_violation';
  end if;

  if exists (
    select 1
    from unnest(coalesce(p_orden_ids, '{}')) as o(id)
    left join public.vales_credito v on v.orden_id = o.id
    where v.verificado_en is null
  ) then
    raise exception 'Solo se pagan órdenes con el vale verificado' using errcode = 'check_violation';
  end if;

  v_pago_id := public.registrar_pago_credito(p_cliente_id, p_orden_ids, p_usuario_id);

  insert into public.detalles_pago_credito (pago_credito_id, medio, registrado_por)
  values (v_pago_id, p_medio, p_usuario_id);

  return v_pago_id;
end;
$$;

comment on function public.registrar_pago_credito_con_medio(bigint, bigint[], bigint, text) is
  'Todo o nada: exige vale verificado en todas las órdenes, paga con registrar_pago_credito() (mismas validaciones del ADR 0005) y guarda el medio en detalles_pago_credito.';

revoke execute on function public.registrar_pago_credito_con_medio(bigint, bigint[], bigint, text)
  from public, anon, authenticated;
grant execute on function public.registrar_pago_credito_con_medio(bigint, bigint[], bigint, text) to service_role;
