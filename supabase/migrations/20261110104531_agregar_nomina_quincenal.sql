-- Nómina quincenal: préstamos y liquidación (SCRUM-159).
--
-- Quincena = 1-15 o 16-último día del mes (CHECK en BD). Comisión de un
-- colaborador en una quincena = suma de (valor × porcentaje_comision,
-- redondeado al entero más cercano POR ORDEN) de sus órdenes NO
-- canceladas con fecha en el periodo, usando el % ya congelado de cada
-- orden. Neto = comisión − préstamos, nunca negativo. Préstamo <=
-- MIN(comisión acumulada − préstamos ya pedidos en la quincena,
-- tope_prestamo_colaborador si es > 0); se descuenta completo al
-- liquidar la quincena en que se pidió, nunca pasa a la siguiente.

-- ============================================================
-- Regla única de redondeo (documentada aquí, usada en TODAS partes vía
-- comision_colaborador_periodo): entero en pesos, por orden individual,
-- round() estándar de Postgres sobre numeric (mitad hacia arriba) — NUNCA
-- se suma primero y se redondea al final, para que la suma de comisiones
-- individuales siempre cuadre con el total reportado.
-- ============================================================

create function public.comision_orden(p_valor integer, p_porcentaje numeric)
returns integer
language sql
immutable
set search_path = ''
as $$
  select round(p_valor * p_porcentaje)::integer;
$$;

comment on function public.comision_orden(integer, numeric) is
  'Regla única de redondeo de comisión: por orden individual, entero en pesos, round() estándar de Postgres (mitad hacia arriba). Nunca se suma primero y se redondea después.';

-- ============================================================
-- Límites de la quincena que contiene una fecha. IMMUTABLE (puro, sin
-- leer tablas ni now()): lo exige usarla dentro de un CHECK constraint.
-- ============================================================

create type public.rango_fechas as (inicio date, fin date);

create function public.limites_quincena(p_fecha date)
returns public.rango_fechas
language sql
immutable
set search_path = ''
as $$
  select
    case when extract(day from p_fecha) <= 15
      then date_trunc('month', p_fecha)::date
      else (date_trunc('month', p_fecha) + interval '15 days')::date
    end as inicio,
    case when extract(day from p_fecha) <= 15
      then (date_trunc('month', p_fecha) + interval '14 days')::date
      else (date_trunc('month', p_fecha) + interval '1 month' - interval '1 day')::date
    end as fin;
$$;

comment on function public.limites_quincena(date) is
  'Quincena (1-15 o 16-último día del mes) que contiene p_fecha. IMMUTABLE: la usa el CHECK de liquidaciones_nomina.';

-- ============================================================
-- Comisión acumulada de un colaborador en un periodo: fuente única,
-- reutilizada por registrar_prestamo(), liquidar_quincena() y la regla
-- de "cancelar rompe préstamos" (proteger_orden_lavado) — nunca se
-- duplica el cálculo.
-- ============================================================

create function public.comision_colaborador_periodo(p_colaborador_id bigint, p_inicio date, p_fin date)
returns integer
language sql
stable
set search_path = ''
as $$
  select coalesce(sum(public.comision_orden(valor, porcentaje_comision)), 0)::integer
  from public.ordenes_lavado
  where colaborador_id = p_colaborador_id
    and fecha between p_inicio and p_fin
    and estado <> 'cancelada';
$$;

comment on function public.comision_colaborador_periodo(bigint, date, date) is
  'Suma de comision_orden() de las órdenes NO canceladas del colaborador en [p_inicio, p_fin]. Única fuente del cálculo: la usan registrar_prestamo(), liquidar_quincena() y proteger_orden_lavado() (regla de cancelar).';

-- limites_quincena/comision_orden/comision_colaborador_periodo son
-- lectura pura, invocadas también DESDE proteger_orden_lavado() — que
-- corre con los privilegios de quien dispara el UPDATE sobre
-- ordenes_lavado (puede ser 'authenticated' directamente, vía las
-- políticas RLS de agregar_politicas_rls_por_rol.sql). Por eso, a
-- diferencia de las funciones RPC de escritura, estas SÍ llevan GRANT a
-- authenticated además de service_role — no exponen nada que esos roles
-- no pudieran ya calcular leyendo las tablas directamente.
revoke execute on function public.limites_quincena(date) from public, anon;
grant execute on function public.limites_quincena(date) to authenticated, service_role;

revoke execute on function public.comision_orden(integer, numeric) from public, anon;
grant execute on function public.comision_orden(integer, numeric) to authenticated, service_role;

revoke execute on function public.comision_colaborador_periodo(bigint, date, date) from public, anon;
grant execute on function public.comision_colaborador_periodo(bigint, date, date) to authenticated, service_role;

-- ============================================================
-- liquidaciones_nomina: encabezado de una quincena liquidada. Totales
-- CONGELADOS en el momento de liquidar. Inmutable (también para
-- service_role, como pagos_credito).
-- ============================================================

create table public.liquidaciones_nomina (
  id bigint generated always as identity,
  periodo_inicio date not null,
  periodo_fin date not null,
  total_comision integer not null,
  total_prestamos integer not null,
  total_neto integer not null,
  liquidado_por bigint not null,
  liquidado_en timestamptz not null default now(),
  creado_en timestamptz not null default now(),
  constraint liquidaciones_nomina_pkey primary key (id),
  constraint liquidaciones_nomina_periodo_key unique (periodo_inicio, periodo_fin),
  constraint liquidaciones_nomina_liquidado_por_fkey foreign key (liquidado_por)
    references public.usuarios (id) on delete restrict,
  constraint liquidaciones_nomina_totales_check
    check (total_comision >= 0 and total_prestamos >= 0 and total_neto >= 0),
  constraint liquidaciones_nomina_periodo_check check (
    periodo_inicio = (public.limites_quincena(periodo_inicio)).inicio
    and periodo_fin = (public.limites_quincena(periodo_inicio)).fin
  )
);

create index idx_liquidaciones_nomina_liquidado_por on public.liquidaciones_nomina (liquidado_por);

comment on table public.liquidaciones_nomina is
  'Encabezado de una quincena liquidada (SCRUM-159): un periodo se liquida una sola vez (UNIQUE). Inmutable: solo la crea liquidar_quincena().';
comment on constraint liquidaciones_nomina_periodo_check on public.liquidaciones_nomina is
  'periodo_inicio/periodo_fin deben ser EXACTAMENTE los límites de la quincena que contiene periodo_inicio (limites_quincena) — rechaza cualquier rango que no sea una quincena real.';

create trigger trg_liquidaciones_nomina_inmutable
  before update on public.liquidaciones_nomina
  for each row execute function public.impedir_modificacion('Una liquidación de nómina no se modifica');

create trigger trg_liquidaciones_nomina_sin_eliminar
  before delete on public.liquidaciones_nomina
  for each row execute function public.impedir_eliminacion('Una liquidación de nómina no se elimina');

create trigger trg_liquidaciones_nomina_sin_truncate
  before truncate on public.liquidaciones_nomina
  for each statement execute function public.impedir_eliminacion('Una liquidación de nómina no se elimina');

alter table public.liquidaciones_nomina enable row level security;
revoke all on table public.liquidaciones_nomina from anon, authenticated;
revoke update, delete, truncate on table public.liquidaciones_nomina from service_role;

create trigger trg_liquidaciones_nomina_auditoria after insert on public.liquidaciones_nomina
  for each row execute function public.registrar_auditoria();

-- ============================================================
-- prestamos_colaborador: un préstamo por fila. No es 100% inmutable como
-- las liquidaciones: liquidar_quincena() necesita poder marcarla con
-- liquidacion_id (null -> un valor) — proteger_prestamo_colaborador()
-- permite SOLO esa transición, igual patrón que proteger_orden_lavado()
-- con pago_credito_id/liquidacion_id.
-- ============================================================

create table public.prestamos_colaborador (
  id bigint generated always as identity,
  colaborador_id bigint not null,
  fecha date not null,
  valor integer not null,
  registrado_por bigint not null,
  liquidacion_id bigint null,
  creado_en timestamptz not null default now(),
  constraint prestamos_colaborador_pkey primary key (id),
  constraint prestamos_colaborador_colaborador_id_fkey foreign key (colaborador_id)
    references public.colaboradores (id) on delete restrict,
  constraint prestamos_colaborador_registrado_por_fkey foreign key (registrado_por)
    references public.usuarios (id) on delete restrict,
  constraint prestamos_colaborador_liquidacion_id_fkey foreign key (liquidacion_id)
    references public.liquidaciones_nomina (id) on delete restrict,
  constraint prestamos_colaborador_valor_check check (valor > 0)
);

create index idx_prestamos_colaborador_colaborador_id on public.prestamos_colaborador (colaborador_id);
create index idx_prestamos_colaborador_registrado_por on public.prestamos_colaborador (registrado_por);
create index idx_prestamos_colaborador_liquidacion_id
  on public.prestamos_colaborador (liquidacion_id) where liquidacion_id is not null;

comment on table public.prestamos_colaborador is
  'Préstamo de un colaborador contra su comisión de la quincena en curso (SCRUM-159). Se crea vía registrar_prestamo(); liquidar_quincena() lo marca con liquidacion_id al liquidar. No pasa saldo a la siguiente quincena.';

create function public.proteger_prestamo_colaborador()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.liquidacion_id is null and new.liquidacion_id is not null
     and (to_jsonb(old) - 'liquidacion_id') = (to_jsonb(new) - 'liquidacion_id') then
    return new;
  end if;

  raise exception 'Un préstamo de colaborador solo se modifica para marcarlo como liquidado'
    using errcode = 'check_violation';
end;
$$;

comment on function public.proteger_prestamo_colaborador() is
  'Permite SOLO que liquidacion_id pase de null a un valor (lo hace liquidar_quincena()); cualquier otro cambio se rechaza.';

create trigger trg_prestamos_colaborador_proteger
  before update on public.prestamos_colaborador
  for each row execute function public.proteger_prestamo_colaborador();

create trigger trg_prestamos_colaborador_sin_eliminar
  before delete on public.prestamos_colaborador
  for each row execute function public.impedir_eliminacion('Un préstamo de colaborador no se elimina');

alter table public.prestamos_colaborador enable row level security;
revoke all on table public.prestamos_colaborador from anon, authenticated;
revoke delete, truncate on table public.prestamos_colaborador from service_role;

create trigger trg_prestamos_colaborador_auditoria after insert or update on public.prestamos_colaborador
  for each row execute function public.registrar_auditoria();

-- ============================================================
-- liquidacion_colaboradores: el detalle congelado por colaborador de
-- cada liquidación. Inmutable también para service_role, igual que
-- liquidaciones_nomina.
-- ============================================================

-- id propio (ademas del par natural liquidacion_id+colaborador_id, único
-- por abajo): registrar_auditoria() (activar_auditoria.sql, existente,
-- no se edita) siempre lee "id" de to_jsonb(new/old) para registro_id —
-- una PK compuesta sin columna id le daría null y violaría el NOT NULL
-- de auditoria.registro_id. Confirmado probándolo.
create table public.liquidacion_colaboradores (
  id bigint generated always as identity,
  liquidacion_id bigint not null,
  colaborador_id bigint not null,
  servicios integer not null,
  producido integer not null,
  comision integer not null,
  prestamos integer not null,
  neto integer not null,
  creado_en timestamptz not null default now(),
  constraint liquidacion_colaboradores_pkey primary key (id),
  constraint liquidacion_colaboradores_liquidacion_colaborador_key unique (liquidacion_id, colaborador_id),
  constraint liquidacion_colaboradores_liquidacion_id_fkey foreign key (liquidacion_id)
    references public.liquidaciones_nomina (id) on delete restrict,
  constraint liquidacion_colaboradores_colaborador_id_fkey foreign key (colaborador_id)
    references public.colaboradores (id) on delete restrict,
  constraint liquidacion_colaboradores_valores_check check (
    servicios >= 0 and producido >= 0 and comision >= 0 and prestamos >= 0 and neto >= 0
  )
);

create index idx_liquidacion_colaboradores_colaborador_id on public.liquidacion_colaboradores (colaborador_id);

comment on table public.liquidacion_colaboradores is
  'Detalle CONGELADO por colaborador de una liquidación (SCRUM-159): servicios, producido, comisión, préstamos y neto en el momento de liquidar. Inmutable, también para service_role.';

create trigger trg_liquidacion_colaboradores_inmutable
  before update on public.liquidacion_colaboradores
  for each row execute function public.impedir_modificacion('El detalle de una liquidación no se modifica');

create trigger trg_liquidacion_colaboradores_sin_eliminar
  before delete on public.liquidacion_colaboradores
  for each row execute function public.impedir_eliminacion('El detalle de una liquidación no se elimina');

create trigger trg_liquidacion_colaboradores_sin_truncate
  before truncate on public.liquidacion_colaboradores
  for each statement execute function public.impedir_eliminacion('El detalle de una liquidación no se elimina');

alter table public.liquidacion_colaboradores enable row level security;
revoke all on table public.liquidacion_colaboradores from anon, authenticated;
revoke update, delete, truncate on table public.liquidacion_colaboradores from service_role;

create trigger trg_liquidacion_colaboradores_auditoria after insert on public.liquidacion_colaboradores
  for each row execute function public.registrar_auditoria();

-- ============================================================
-- ordenes_lavado.liquidacion_id: qué liquidación cerró esta orden.
-- ============================================================

alter table public.ordenes_lavado
  add column liquidacion_id bigint null;

alter table public.ordenes_lavado
  add constraint ordenes_lavado_liquidacion_id_fkey foreign key (liquidacion_id)
    references public.liquidaciones_nomina (id) on delete restrict;

create index idx_ordenes_lavado_liquidacion_id
  on public.ordenes_lavado (liquidacion_id)
  where liquidacion_id is not null;

comment on column public.ordenes_lavado.liquidacion_id is
  'R12: qué liquidación de nómina cerró esta orden (null hasta que se liquida su quincena). Tras liquidar, la orden no se cancela.';

-- Mismo mecanismo que pago_credito_id (ver ADR 0005): un REVOKE de
-- columna sola, encima de un GRANT de tabla, no restringe nada — hay que
-- revocar insert/update de TABLA y volver a darlos por columnas
-- explícitas, sin liquidacion_id (ni pago_credito_id, que ya quedó fuera
-- desde agregar_pagos_credito.sql).
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
-- proteger_orden_lavado(): conserva TODO lo de agregar_pagos_credito.sql
-- y agrega el caso especial de liquidacion_id, R12 (no cancelar tras
-- liquidar) y R13 (cancelar no puede dejar la comisión por debajo de los
-- préstamos pendientes de la quincena).
-- ============================================================

create or replace function public.proteger_orden_lavado()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_porcentaje numeric(5, 4);
  v_solo_pago_o_liquidacion boolean;
  v_rango public.rango_fechas;
  v_comision_restante integer;
  v_prestamos_pendientes integer;
begin
  -- Caso especial: pago_credito_id O liquidacion_id (nunca junto con
  -- ningún otro campo) pasan de null a un valor, incluso en una orden ya
  -- cerrada — ver ADR 0005 (pago_credito_id) y ADR de esta migración
  -- (liquidacion_id).
  v_solo_pago_o_liquidacion :=
    (
      (old.pago_credito_id is null and new.pago_credito_id is not null
       and new.liquidacion_id is not distinct from old.liquidacion_id)
      or
      (old.liquidacion_id is null and new.liquidacion_id is not null
       and new.pago_credito_id is not distinct from old.pago_credito_id)
    )
    and (to_jsonb(old) - array['pago_credito_id', 'liquidacion_id', 'actualizado_en'])
        = (to_jsonb(new) - array['pago_credito_id', 'liquidacion_id', 'actualizado_en']);

  if v_solo_pago_o_liquidacion then
    return new;
  end if;

  -- R11 (SCRUM-158): una orden con un pago de crédito registrado no se
  -- cancela. Defensa en profundidad, hoy inalcanzable (ver ADR 0005).
  if new.estado = 'cancelada' and old.estado <> 'cancelada' and old.pago_credito_id is not null then
    raise exception 'Una orden con un pago de crédito registrado no se puede cancelar'
      using errcode = 'check_violation';
  end if;

  -- R12 (SCRUM-159): tras liquidar, ninguna orden del periodo se cancela.
  -- También defensa en profundidad, también inalcanzable hoy: liquidar
  -- exige que no haya órdenes abiertas, así que toda orden con
  -- liquidacion_id ya está entregada o cancelada, y el bloqueo general
  -- de abajo ya la detendría primero (ver ADR de esta migración).
  if new.estado = 'cancelada' and old.estado <> 'cancelada' and old.liquidacion_id is not null then
    raise exception 'Una orden de un periodo de nómina ya liquidado no se puede cancelar'
      using errcode = 'check_violation';
  end if;

  -- R13 (SCRUM-159): cancelar una orden ABIERTA (esta sí es alcanzable)
  -- que dejaría la comisión del colaborador en su quincena por debajo de
  -- sus préstamos ya registrados y aún no liquidados, se bloquea.
  if new.estado = 'cancelada' and old.estado in ('registrada', 'en_proceso') then
    v_rango := public.limites_quincena(old.fecha);
    v_comision_restante := public.comision_colaborador_periodo(old.colaborador_id, v_rango.inicio, v_rango.fin)
      - public.comision_orden(old.valor, old.porcentaje_comision);

    select coalesce(sum(valor), 0) into v_prestamos_pendientes
      from public.prestamos_colaborador
      where colaborador_id = old.colaborador_id
        and fecha between v_rango.inicio and v_rango.fin
        and liquidacion_id is null;

    if v_comision_restante < v_prestamos_pendientes then
      raise exception 'Cancelar esta orden dejaría la comisión del colaborador en la quincena por debajo de sus préstamos ya registrados'
        using errcode = 'check_violation';
    end if;
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
-- registrar_prestamo(): atómico, con bloqueo de filas.
-- ============================================================

create function public.registrar_prestamo(
  p_colaborador_id bigint,
  p_valor integer,
  p_fecha date,
  p_usuario_id bigint
)
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  v_id bigint;
  v_estado_colaborador text;
  v_rango public.rango_fechas;
  v_comision integer;
  v_prestamos_previos integer;
  v_tope integer;
  v_disponible integer;
begin
  if p_valor is null or p_valor <= 0 then
    raise exception 'El valor del préstamo debe ser mayor que cero' using errcode = 'check_violation';
  end if;

  select estado into v_estado_colaborador
  from public.colaboradores
  where id = p_colaborador_id
  for update;

  if not found then
    raise exception 'El colaborador % no existe', p_colaborador_id using errcode = 'foreign_key_violation';
  end if;

  if v_estado_colaborador <> 'activo' then
    raise exception 'Solo se pueden registrar préstamos a colaboradores activos' using errcode = 'check_violation';
  end if;

  v_rango := public.limites_quincena(p_fecha);

  if exists (
    select 1 from public.liquidaciones_nomina
    where periodo_inicio = v_rango.inicio and periodo_fin = v_rango.fin
  ) then
    raise exception 'La quincena % – % ya fue liquidada; no se pueden registrar más préstamos',
      v_rango.inicio, v_rango.fin using errcode = 'check_violation';
  end if;

  -- Bloquea los préstamos existentes de este colaborador/quincena: dos
  -- préstamos concurrentes del mismo colaborador se serializan, en vez
  -- de que ambos lean el mismo "disponible" y lo exploten entre los dos.
  perform 1 from public.prestamos_colaborador
    where colaborador_id = p_colaborador_id and fecha between v_rango.inicio and v_rango.fin
    for update;

  v_comision := public.comision_colaborador_periodo(p_colaborador_id, v_rango.inicio, v_rango.fin);

  select coalesce(sum(valor), 0) into v_prestamos_previos
    from public.prestamos_colaborador
    where colaborador_id = p_colaborador_id and fecha between v_rango.inicio and v_rango.fin;

  select tope_prestamo_colaborador into v_tope from public.parametros_negocio where id = 1;

  v_disponible := v_comision - v_prestamos_previos;
  if v_tope > 0 and v_tope < v_disponible then
    v_disponible := v_tope;
  end if;

  if p_valor > v_disponible then
    raise exception 'El préstamo supera el disponible de la quincena (comisión acumulada menos préstamos ya pedidos, o el tope configurado)'
      using errcode = 'check_violation';
  end if;

  insert into public.prestamos_colaborador (colaborador_id, fecha, valor, registrado_por)
  values (p_colaborador_id, p_fecha, p_valor, p_usuario_id)
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.registrar_prestamo(bigint, integer, date, bigint) is
  'Valida (colaborador activo, quincena no liquidada, valor <= comisión acumulada menos préstamos ya pedidos, acotado por tope_prestamo_colaborador si es > 0) y solo entonces inserta el préstamo. Bloquea los préstamos existentes del colaborador/quincena para serializar préstamos concurrentes.';

revoke execute on function public.registrar_prestamo(bigint, integer, date, bigint) from public, anon, authenticated;
grant execute on function public.registrar_prestamo(bigint, integer, date, bigint) to service_role;

-- ============================================================
-- liquidar_quincena(): atómico, con bloqueo de filas. p_hoy es
-- parametrizable (default current_date) para poder probar con fechas de
-- referencia fijas, sin depender de now().
-- ============================================================

create function public.liquidar_quincena(
  p_inicio date,
  p_fin date,
  p_usuario_id bigint,
  p_hoy date default current_date
)
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  v_liquidacion_id bigint;
  v_rango public.rango_fechas;
begin
  v_rango := public.limites_quincena(p_inicio);
  if p_inicio <> v_rango.inicio or p_fin <> v_rango.fin then
    raise exception 'El periodo % – % no es una quincena válida', p_inicio, p_fin using errcode = 'check_violation';
  end if;

  if p_hoy < p_fin then
    raise exception 'No se puede liquidar una quincena que aún no ha terminado' using errcode = 'check_violation';
  end if;

  if exists (
    select 1 from public.ordenes_lavado
    where fecha between p_inicio and p_fin and estado in ('registrada', 'en_proceso')
    for update
  ) then
    raise exception 'Hay órdenes abiertas en el periodo; no se puede liquidar' using errcode = 'check_violation';
  end if;

  -- Bloquea el resto de órdenes y los préstamos del periodo antes de
  -- agregar nada, para que dos liquidaciones concurrentes del mismo
  -- periodo se serialicen (la segunda choca con el UNIQUE de periodo).
  perform 1 from public.ordenes_lavado where fecha between p_inicio and p_fin for update;
  perform 1 from public.prestamos_colaborador where fecha between p_inicio and p_fin for update;

  with detalle as (
    select
      o.colaborador_id,
      count(*) filter (where o.estado <> 'cancelada') as servicios,
      coalesce(sum(o.valor) filter (where o.estado <> 'cancelada'), 0) as producido,
      public.comision_colaborador_periodo(o.colaborador_id, p_inicio, p_fin) as comision,
      coalesce((
        select sum(pr.valor) from public.prestamos_colaborador pr
        where pr.colaborador_id = o.colaborador_id and pr.fecha between p_inicio and p_fin
      ), 0) as prestamos
    from public.ordenes_lavado o
    where o.fecha between p_inicio and p_fin
    group by o.colaborador_id
  ), detalle_neto as (
    select colaborador_id, servicios, producido, comision, prestamos,
      greatest(comision - prestamos, 0) as neto
    from detalle
  ), nueva_liquidacion as (
    insert into public.liquidaciones_nomina (periodo_inicio, periodo_fin, total_comision, total_prestamos, total_neto, liquidado_por)
    select p_inicio, p_fin, coalesce(sum(comision), 0), coalesce(sum(prestamos), 0), coalesce(sum(neto), 0), p_usuario_id
    from detalle_neto
    returning id
  )
  insert into public.liquidacion_colaboradores (liquidacion_id, colaborador_id, servicios, producido, comision, prestamos, neto)
  select (select id from nueva_liquidacion), colaborador_id, servicios, producido, comision, prestamos, neto
  from detalle_neto;

  select id into v_liquidacion_id
  from public.liquidaciones_nomina
  where periodo_inicio = p_inicio and periodo_fin = p_fin;

  update public.ordenes_lavado set liquidacion_id = v_liquidacion_id
    where fecha between p_inicio and p_fin;

  update public.prestamos_colaborador set liquidacion_id = v_liquidacion_id
    where fecha between p_inicio and p_fin;

  return v_liquidacion_id;
end;
$$;

comment on function public.liquidar_quincena(date, date, bigint, date) is
  'Todo o nada: valida el periodo (quincena real, ya terminada, sin órdenes abiertas), bloquea sus filas, calcula el detalle por colaborador (servicios/producido/comisión/préstamos/neto, todo CONGELADO) en una sola sentencia, y marca ordenes_lavado/prestamos_colaborador con el liquidacion_id resultante. p_hoy (default current_date) permite probar con una fecha de referencia fija.';

revoke execute on function public.liquidar_quincena(date, date, bigint, date) from public, anon, authenticated;
grant execute on function public.liquidar_quincena(date, date, bigint, date) to service_role;

-- ============================================================
-- RLS: consultar los tres roles operativos; escribir solo vía RPC (sin
-- GRANT de INSERT/UPDATE/DELETE a authenticated) — mismo patrón del ADR
-- 0004/0005 en las tres tablas nuevas.
-- ============================================================

grant select on public.liquidaciones_nomina to authenticated;
create policy liquidaciones_nomina_select_superadmin_administrador_soporte
  on public.liquidaciones_nomina for select to authenticated
  using ((select public.rol_actual()) = any (array['superadmin', 'administrador', 'soporte']));
comment on policy liquidaciones_nomina_select_superadmin_administrador_soporte on public.liquidaciones_nomina is
  'Consultar liquidaciones de nómina: superadmin, administrador y soporte (igual patrón del ADR 0004).';

grant select on public.prestamos_colaborador to authenticated;
create policy prestamos_colaborador_select_superadmin_administrador_soporte
  on public.prestamos_colaborador for select to authenticated
  using ((select public.rol_actual()) = any (array['superadmin', 'administrador', 'soporte']));
comment on policy prestamos_colaborador_select_superadmin_administrador_soporte on public.prestamos_colaborador is
  'Consultar préstamos de colaboradores: superadmin, administrador y soporte (igual patrón del ADR 0004).';

grant select on public.liquidacion_colaboradores to authenticated;
create policy liquidacion_colaboradores_select_superadmin_administrador_soporte
  on public.liquidacion_colaboradores for select to authenticated
  using ((select public.rol_actual()) = any (array['superadmin', 'administrador', 'soporte']));
comment on policy liquidacion_colaboradores_select_superadmin_administrador_soporte on public.liquidacion_colaboradores is
  'Consultar el detalle de liquidaciones: superadmin, administrador y soporte (igual patrón del ADR 0004).';
