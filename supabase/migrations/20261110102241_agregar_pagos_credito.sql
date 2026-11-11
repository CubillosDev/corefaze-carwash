-- Crédito empresarial: pagos completos de órdenes a crédito (SCRUM-158).
--
-- El crédito solo sirve para saber qué empresa debe qué lavados: un
-- gerente llega, elige qué órdenes paga, y se pagan COMPLETAS (sin
-- abonos parciales, sin vales, sin cupo, sin fecha de corte). Saldo
-- pendiente = ordenes_lavado con medio_pago='credito', estado<>'cancelada'
-- y sin pago (pago_credito_id is null). Solo se paga una orden 'entregada'.

-- ============================================================
-- impedir_modificacion(): contraparte genérica de impedir_eliminacion()
-- (crear_funciones_comunes.sql) para bloquear UPDATE en vez de DELETE.
-- Reutilizable por cualquier tabla inmutable del proyecto.
-- ============================================================

create function public.impedir_modificacion()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '%', tg_argv[0] using errcode = 'check_violation';
end;
$$;

comment on function public.impedir_modificacion() is
  'Trigger BEFORE UPDATE genérico: rechaza la modificación con el mensaje recibido como argumento (SQLSTATE 23514) — contraparte de impedir_eliminacion() (23001) para tablas inmutables.';

-- ============================================================
-- pagos_credito: un pago agrupa N órdenes, de solo inserción.
-- ============================================================

create table public.pagos_credito (
  id bigint generated always as identity,
  cliente_id bigint not null,
  valor_total integer not null,
  registrado_por bigint not null,
  pagado_en timestamptz not null default now(),
  creado_en timestamptz not null default now(),
  constraint pagos_credito_pkey primary key (id),
  constraint pagos_credito_cliente_id_fkey foreign key (cliente_id)
    references public.clientes (id) on delete restrict,
  constraint pagos_credito_registrado_por_fkey foreign key (registrado_por)
    references public.usuarios (id) on delete restrict,
  constraint pagos_credito_valor_total_check check (valor_total > 0)
);

create index idx_pagos_credito_cliente_id on public.pagos_credito (cliente_id);
create index idx_pagos_credito_registrado_por on public.pagos_credito (registrado_por);

comment on table public.pagos_credito is
  'Un pago agrupa N órdenes a crédito del mismo cliente, pagadas completas de una vez (SCRUM-158). Inmutable: solo lo crea registrar_pago_credito().';
comment on column public.pagos_credito.valor_total is 'Suma de ordenes_lavado.valor de las órdenes incluidas en este pago.';

create trigger trg_pagos_credito_actualizado_en
  before update on public.pagos_credito
  for each row execute function public.impedir_modificacion('Un pago de crédito no se modifica');

create trigger trg_pagos_credito_sin_eliminar
  before delete on public.pagos_credito
  for each row execute function public.impedir_eliminacion('Un pago de crédito no se elimina');

create trigger trg_pagos_credito_sin_truncate
  before truncate on public.pagos_credito
  for each statement execute function public.impedir_eliminacion('Un pago de crédito no se elimina');

alter table public.pagos_credito enable row level security;
revoke all on table public.pagos_credito from anon, authenticated;
revoke update, delete, truncate on table public.pagos_credito from service_role;

create trigger trg_pagos_credito_auditoria after insert on public.pagos_credito
  for each row execute function public.registrar_auditoria();

-- ============================================================
-- ordenes_lavado.pago_credito_id: qué pago saldó esta orden (si fue a
-- crédito y ya se pagó). Columna nueva vía ALTER (no se edita la
-- migración original de la tabla).
-- ============================================================

alter table public.ordenes_lavado
  add column pago_credito_id bigint null;

alter table public.ordenes_lavado
  add constraint ordenes_lavado_pago_credito_id_fkey foreign key (pago_credito_id)
    references public.pagos_credito (id) on delete restrict;

alter table public.ordenes_lavado
  add constraint ordenes_lavado_pago_credito_medio_check
    check (pago_credito_id is null or medio_pago = 'credito');

create index idx_ordenes_lavado_pago_credito_id
  on public.ordenes_lavado (pago_credito_id)
  where pago_credito_id is not null;

comment on column public.ordenes_lavado.pago_credito_id is
  'R11: solo se puede pagar una orden a crédito, completa, vía registrar_pago_credito(). Null mientras no se ha pagado.';

-- authenticated nunca pone pago_credito_id por su cuenta (bypasea toda
-- la validación de registrar_pago_credito): solo esa función, corriendo
-- como quien la invoque (normalmente service_role), puede tocar esta
-- columna. Un REVOKE de columna por sí solo NO alcanza: un GRANT de
-- tabla (el de agregar_politicas_rls_por_rol.sql) ya cubre todas sus
-- columnas, incluidas las que se agreguen después, y has_column_privilege
-- es verdadero si CUALQUIERA de los dos (tabla o columna) lo permite —
-- confirmado probándolo. Por eso hay que revocar insert/update de TABLA
-- y volver a dar el GRANT por columnas explícitas, sin pago_credito_id
-- (mismo resultado práctico que antes para todas las demás columnas).
revoke insert, update on public.ordenes_lavado from authenticated;

grant insert (
  jornada_id, fecha, turno, vehiculo_id, servicio_id, colaborador_id, cliente_id, valor,
  porcentaje_comision, medio_pago, autoriza_motor, observaciones, motivo, estado, creado_en, actualizado_en
) on public.ordenes_lavado to authenticated;

grant update (
  jornada_id, fecha, turno, vehiculo_id, servicio_id, colaborador_id, cliente_id, valor,
  porcentaje_comision, medio_pago, autoriza_motor, observaciones, motivo, estado, creado_en, actualizado_en
) on public.ordenes_lavado to authenticated;

-- ============================================================
-- proteger_orden_lavado(): agrega el caso especial de pago_credito_id
-- (va de null a un valor en una orden YA 'entregada', sin tocar ningún
-- otro campo) y R11 (una orden pagada no se cancela). Conserva TODO el
-- comportamiento anterior sin cambios (campos congelados, porcentaje_comision,
-- orden cerrada inmutable) — ver crear_reglas_ordenes_lavado.sql.
-- ============================================================

create or replace function public.proteger_orden_lavado()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_porcentaje numeric(5, 4);
  v_solo_pago_credito boolean;
begin
  -- Caso especial: registrar_pago_credito() solo cambia pago_credito_id
  -- de null a un valor, sin tocar ningún otro campo — incluso en una
  -- orden ya 'entregada' (que, de otro modo, es inmutable). Cualquier
  -- otro cambio junto con pago_credito_id cae al bloqueo de abajo.
  v_solo_pago_credito :=
    old.pago_credito_id is null and new.pago_credito_id is not null
    and (to_jsonb(old) - array['pago_credito_id', 'actualizado_en'])
        = (to_jsonb(new) - array['pago_credito_id', 'actualizado_en']);

  if v_solo_pago_credito then
    return new;
  end if;

  -- R11: una orden con un pago de crédito registrado no se cancela.
  -- Nota: hoy es inalcanzable en la práctica (pago_credito_id solo se
  -- asigna a órdenes ya 'entregada', y 'entregada' ya es terminal —
  -- transicionesOrden.entregada = [] — así que el bloqueo general de
  -- abajo ya la detendría primero); se deja como defensa en profundidad
  -- explícita, con un mensaje más específico, por si la máquina de
  -- estados cambia más adelante.
  if new.estado = 'cancelada' and old.estado <> 'cancelada' and old.pago_credito_id is not null then
    raise exception 'Una orden con un pago de crédito registrado no se puede cancelar'
      using errcode = 'check_violation';
  end if;

  if old.estado in ('entregada', 'cancelada') then
    raise exception 'Una orden entregada o cancelada no se modifica'
      using errcode = 'check_violation';
  end if;

  if new.valor <> old.valor
     or new.servicio_id <> old.servicio_id
     or new.jornada_id <> old.jornada_id
     or new.fecha <> old.fecha
     or new.turno <> old.turno
     or new.creado_en <> old.creado_en then
    raise exception 'valor, servicio, jornada, fecha, turno y creado_en de una orden no se modifican'
      using errcode = 'check_violation';
  end if;

  if new.colaborador_id <> old.colaborador_id then
    select c.porcentaje_comision into v_porcentaje
    from public.colaboradores c
    where c.id = new.colaborador_id;

    if not found then
      raise exception 'El colaborador % no existe', new.colaborador_id
        using errcode = 'foreign_key_violation';
    end if;

    new.porcentaje_comision := v_porcentaje;
  elsif new.porcentaje_comision <> old.porcentaje_comision then
    raise exception 'El porcentaje de comisión de una orden no se modifica'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

-- ============================================================
-- registrar_pago_credito(): todo o nada. Bloquea las filas de las
-- órdenes (select ... for update, ordenadas por id para no generar
-- deadlocks entre pagos concurrentes del mismo/distinto cliente), valida
-- TODO, y solo entonces inserta el pago y marca las órdenes.
-- ============================================================

create function public.registrar_pago_credito(
  p_cliente_id bigint,
  p_orden_ids bigint[],
  p_usuario_id bigint
)
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  v_pago_id bigint;
  v_valor_total integer;
  v_cantidad_pedidas integer;
  v_cantidad_distintas integer;
  v_cantidad_encontradas integer;
begin
  if p_orden_ids is null or array_length(p_orden_ids, 1) is null then
    raise exception 'Debe indicar al menos una orden para pagar' using errcode = 'check_violation';
  end if;

  select count(*) into v_cantidad_pedidas from unnest(p_orden_ids) as x;
  select count(distinct x) into v_cantidad_distintas from unnest(p_orden_ids) as x;

  if v_cantidad_pedidas <> v_cantidad_distintas then
    raise exception 'El arreglo de órdenes no puede tener ids repetidos' using errcode = 'check_violation';
  end if;

  -- Bloquea las filas involucradas ANTES de validar nada, en orden
  -- estable (por id), para que dos pagos concurrentes que compartan
  -- alguna orden se serialicen en vez de deadlockearse.
  perform 1
  from public.ordenes_lavado
  where id = any(p_orden_ids)
  order by id
  for update;

  select count(*) into v_cantidad_encontradas
  from public.ordenes_lavado
  where id = any(p_orden_ids);

  if v_cantidad_encontradas <> v_cantidad_distintas then
    raise exception 'Alguna de las órdenes indicadas no existe' using errcode = 'foreign_key_violation';
  end if;

  if exists (
    select 1 from public.ordenes_lavado
    where id = any(p_orden_ids) and cliente_id is distinct from p_cliente_id
  ) then
    raise exception 'Todas las órdenes deben pertenecer al cliente indicado' using errcode = 'check_violation';
  end if;

  if exists (
    select 1 from public.ordenes_lavado where id = any(p_orden_ids) and medio_pago <> 'credito'
  ) then
    raise exception 'Solo se pueden pagar órdenes a crédito' using errcode = 'check_violation';
  end if;

  if exists (
    select 1 from public.ordenes_lavado where id = any(p_orden_ids) and estado <> 'entregada'
  ) then
    raise exception 'Solo se pueden pagar órdenes en estado entregada' using errcode = 'check_violation';
  end if;

  if exists (
    select 1 from public.ordenes_lavado where id = any(p_orden_ids) and pago_credito_id is not null
  ) then
    raise exception 'Alguna de las órdenes ya tiene un pago registrado' using errcode = 'unique_violation';
  end if;

  select sum(valor) into v_valor_total from public.ordenes_lavado where id = any(p_orden_ids);

  insert into public.pagos_credito (cliente_id, valor_total, registrado_por)
  values (p_cliente_id, v_valor_total, p_usuario_id)
  returning id into v_pago_id;

  update public.ordenes_lavado set pago_credito_id = v_pago_id where id = any(p_orden_ids);

  return v_pago_id;
end;
$$;

comment on function public.registrar_pago_credito(bigint, bigint[], bigint) is
  'Todo o nada: bloquea las órdenes indicadas, valida que existan, sean del cliente, a crédito, entregadas y sin pago previo, y solo entonces crea el pago (suma de valor) y marca pago_credito_id en todas. Si cualquier validación falla, no se paga nada.';

revoke execute on function public.registrar_pago_credito(bigint, bigint[], bigint) from public, anon, authenticated;
grant execute on function public.registrar_pago_credito(bigint, bigint[], bigint) to service_role;

-- ============================================================
-- RLS de pagos_credito: consultar los tres roles operativos; escribir
-- solo vía registrar_pago_credito() (service_role) — sin GRANT de
-- INSERT/UPDATE/DELETE a authenticated en absoluto.
-- ============================================================

grant select on public.pagos_credito to authenticated;

create policy pagos_credito_select_superadmin_administrador_soporte
  on public.pagos_credito for select to authenticated
  using ((select public.rol_actual()) = any (array['superadmin', 'administrador', 'soporte']));

comment on policy pagos_credito_select_superadmin_administrador_soporte on public.pagos_credito is
  'Consultar pagos de crédito: superadmin, administrador y soporte — mismo criterio que consultar clientes/órdenes (igual patrón del ADR 0004).';
