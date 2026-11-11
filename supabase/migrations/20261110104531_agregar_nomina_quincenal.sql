-- Nómina quincenal: descuentos y liquidación (SCRUM-159).
--
-- Quincena = 1-15 o 16-último día del mes (CHECK en BD). Comisión de un
-- colaborador en una quincena = suma de (valor × porcentaje_comision,
-- redondeado al entero más cercano POR ORDEN) de sus órdenes NO
-- canceladas con fecha en el periodo, usando el % ya congelado de cada
-- orden.
--
-- Fórmula real (comparada contra la planilla, hoja T1):
--   NETO = TOTAL − PRÉSTAMOS − JABÓN − CAFÉ 1 − CAFÉ 2 − ABONOS − CXC − FONDO − MULTAS
-- Decisión de negocio: UNA sola tabla de descuentos con columna `tipo`,
-- no una tabla por categoría. Hoy el CHECK de `tipo` solo cubre
-- ('prestamo', 'jabon', 'multa', 'cxc') — las categorías de la planilla
-- real que ya se pudieron probar contra datos reales; agregar
-- café/abono/fondo más adelante es ampliar ese CHECK (una migración
-- nueva, sin tocar esta), ver ADR 0006.
--
-- Solo 'prestamo' tiene límite (no puede superar la comisión acumulada
-- menos TODOS los descuentos ya registrados en la quincena, acotado por
-- tope_prestamo_colaborador si es > 0); jabón/multa/cxc se registran sin
-- ese límite, por diseño pueden superar la comisión.
--
-- Neto = greatest(comisión − descuentos, 0); si los descuentos superan
-- la comisión, el saldo que falta (saldo_pendiente) se congela en el
-- detalle Y se convierte automáticamente en un descuento tipo 'cxc' de
-- la quincena SIGUIENTE, para cobrarlo ahí — nunca se pierde.

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
-- reutilizada por registrar_descuento(), liquidar_quincena() y la regla
-- de "cancelar/reasignar rompe préstamos" (proteger_orden_lavado) —
-- nunca se duplica el cálculo.
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
  'Suma de comision_orden() de las órdenes NO canceladas del colaborador en [p_inicio, p_fin]. Única fuente del cálculo: la usan registrar_descuento(), liquidar_quincena() y proteger_orden_lavado() (reglas de cancelar/reasignar).';

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
-- Clave determinística de advisory lock para una quincena: misma clave
-- para el mismo periodo_inicio en registrar_descuento() y
-- liquidar_quincena(), para serializar ambas operaciones sobre la misma
-- quincena (evita que un descuento se registre a la vez que se liquida
-- el mismo periodo).
-- ============================================================

create function public.clave_bloqueo_quincena(p_periodo_inicio date)
returns bigint
language sql
immutable
set search_path = ''
as $$
  select extract(epoch from p_periodo_inicio)::bigint;
$$;

comment on function public.clave_bloqueo_quincena(date) is
  'Clave determinística (derivada de periodo_inicio) para pg_advisory_xact_lock: la misma quincena siempre da la misma clave, usada por registrar_descuento() y liquidar_quincena() para serializarse entre sí.';

revoke execute on function public.clave_bloqueo_quincena(date) from public, anon, authenticated;
grant execute on function public.clave_bloqueo_quincena(date) to service_role;

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
  total_descuentos integer not null,
  total_neto integer not null,
  liquidado_por bigint not null,
  liquidado_en timestamptz not null default now(),
  creado_en timestamptz not null default now(),
  constraint liquidaciones_nomina_pkey primary key (id),
  constraint liquidaciones_nomina_periodo_key unique (periodo_inicio, periodo_fin),
  constraint liquidaciones_nomina_liquidado_por_fkey foreign key (liquidado_por)
    references public.usuarios (id) on delete restrict,
  constraint liquidaciones_nomina_totales_check
    check (total_comision >= 0 and total_descuentos >= 0 and total_neto >= 0),
  constraint liquidaciones_nomina_periodo_check check (
    periodo_inicio = (public.limites_quincena(periodo_inicio)).inicio
    and periodo_fin = (public.limites_quincena(periodo_inicio)).fin
  )
);

create index idx_liquidaciones_nomina_liquidado_por on public.liquidaciones_nomina (liquidado_por);

comment on table public.liquidaciones_nomina is
  'Encabezado de una quincena liquidada (SCRUM-159): un periodo se liquida una sola vez (UNIQUE). total_descuentos suma TODOS los tipos (préstamo/jabón/multa/cxc). Inmutable: solo la crea liquidar_quincena().';
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
-- descuentos_colaborador: UNA fila por descuento, con su tipo
-- ('prestamo', 'jabon', 'multa', 'cxc' — ampliable vía CHECK, ver ADR
-- 0006). No es 100% inmutable como las liquidaciones: liquidar_quincena()
-- necesita poder marcarla con liquidacion_id (null -> un valor) —
-- proteger_descuento_colaborador() permite SOLO esa transición, igual
-- patrón que proteger_orden_lavado() con pago_credito_id/liquidacion_id.
-- ============================================================

create table public.descuentos_colaborador (
  id bigint generated always as identity,
  colaborador_id bigint not null,
  fecha date not null,
  tipo text not null,
  valor integer not null,
  observacion varchar(255) null,
  registrado_por bigint not null,
  liquidacion_id bigint null,
  creado_en timestamptz not null default now(),
  constraint descuentos_colaborador_pkey primary key (id),
  constraint descuentos_colaborador_colaborador_id_fkey foreign key (colaborador_id)
    references public.colaboradores (id) on delete restrict,
  constraint descuentos_colaborador_registrado_por_fkey foreign key (registrado_por)
    references public.usuarios (id) on delete restrict,
  constraint descuentos_colaborador_liquidacion_id_fkey foreign key (liquidacion_id)
    references public.liquidaciones_nomina (id) on delete restrict,
  constraint descuentos_colaborador_valor_check check (valor > 0),
  constraint descuentos_colaborador_tipo_check check (tipo in ('prestamo', 'jabon', 'multa', 'cxc'))
);

create index idx_descuentos_colaborador_colaborador_id on public.descuentos_colaborador (colaborador_id);
create index idx_descuentos_colaborador_registrado_por on public.descuentos_colaborador (registrado_por);
create index idx_descuentos_colaborador_liquidacion_id
  on public.descuentos_colaborador (liquidacion_id) where liquidacion_id is not null;
create index idx_descuentos_colaborador_colaborador_fecha on public.descuentos_colaborador (colaborador_id, fecha);

comment on table public.descuentos_colaborador is
  'Descuento de un colaborador contra su comisión de la quincena en curso (SCRUM-159): tipo prestamo/jabon/multa/cxc (CHECK ampliable para café/abono/fondo, ver ADR 0006). Solo tipo=''prestamo'' tiene límite por comisión disponible; se crea vía registrar_descuento() o automáticamente (tipo ''cxc'') desde liquidar_quincena() cuando el saldo de una quincena queda pendiente. liquidar_quincena() lo marca con liquidacion_id al liquidar.';
comment on constraint descuentos_colaborador_tipo_check on public.descuentos_colaborador is
  'Tipos de descuento soportados hoy, comparados contra la planilla real (hoja T1). Agregar café/abono/fondo es ampliar este CHECK en una migración nueva.';

create function public.proteger_descuento_colaborador()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.liquidacion_id is null and new.liquidacion_id is not null
     and (to_jsonb(old) - 'liquidacion_id') = (to_jsonb(new) - 'liquidacion_id') then
    return new;
  end if;

  raise exception 'Un descuento de colaborador solo se modifica para marcarlo como liquidado'
    using errcode = 'check_violation';
end;
$$;

comment on function public.proteger_descuento_colaborador() is
  'Permite SOLO que liquidacion_id pase de null a un valor (lo hace liquidar_quincena()); cualquier otro cambio se rechaza.';

create trigger trg_descuentos_colaborador_proteger
  before update on public.descuentos_colaborador
  for each row execute function public.proteger_descuento_colaborador();

create trigger trg_descuentos_colaborador_sin_eliminar
  before delete on public.descuentos_colaborador
  for each row execute function public.impedir_eliminacion('Un descuento de colaborador no se elimina');

alter table public.descuentos_colaborador enable row level security;
revoke all on table public.descuentos_colaborador from anon, authenticated;
revoke delete, truncate on table public.descuentos_colaborador from service_role;

create trigger trg_descuentos_colaborador_auditoria after insert or update on public.descuentos_colaborador
  for each row execute function public.registrar_auditoria();

-- ============================================================
-- Descuentos acumulados de un colaborador en un periodo: fuente única,
-- reutilizada por registrar_descuento(), liquidar_quincena() y
-- validar_cobertura_prestamos_colaborador() (R13/R14 en
-- proteger_orden_lavado) — nunca se duplica el cálculo. p_tipo es
-- opcional: null suma TODOS los tipos (lo que usa liquidar_quincena()
-- para el total de descuentos); con un tipo puntual (p.ej. 'prestamo')
-- suma solo ese (lo que usa el límite de préstamo y R13/R14, que SOLO
-- protegen préstamos). No filtra por liquidacion_id: mientras la
-- quincena no esté liquidada (la única situación en que la consultan
-- esas funciones), ninguna de sus filas puede tenerlo distinto de null.
-- ============================================================

create function public.descuentos_colaborador_periodo(
  p_colaborador_id bigint,
  p_inicio date,
  p_fin date,
  p_tipo text default null
)
returns integer
language sql
stable
set search_path = ''
as $$
  select coalesce(sum(valor), 0)::integer
  from public.descuentos_colaborador
  where colaborador_id = p_colaborador_id
    and fecha between p_inicio and p_fin
    and (p_tipo is null or tipo = p_tipo);
$$;

comment on function public.descuentos_colaborador_periodo(bigint, date, date, text) is
  'Suma de los descuentos del colaborador con fecha en [p_inicio, p_fin]; p_tipo null suma todos los tipos, con un tipo puntual suma solo ese (p.ej. ''prestamo'' para el límite de préstamo y R13/R14). Única fuente del cálculo: la usan registrar_descuento(), liquidar_quincena() y validar_cobertura_prestamos_colaborador().';

-- Misma excepción razonada que limites_quincena/comision_orden/
-- comision_colaborador_periodo: la invoca también
-- validar_cobertura_prestamos_colaborador(), llamada desde
-- proteger_orden_lavado(), que puede correr como authenticated.
revoke execute on function public.descuentos_colaborador_periodo(bigint, date, date, text) from public, anon;
grant execute on function public.descuentos_colaborador_periodo(bigint, date, date, text) to authenticated, service_role;

-- ============================================================
-- liquidacion_colaboradores: el detalle congelado por colaborador de
-- cada liquidación. Inmutable también para service_role, igual que
-- liquidaciones_nomina. saldo_pendiente es lo que la comisión de la
-- quincena no alcanzó a cubrir (invariante: neto = comision - descuentos
-- + saldo_pendiente); si es > 0, liquidar_quincena() lo convierte en un
-- descuento tipo 'cxc' de la quincena siguiente, en la misma sentencia.
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
  descuentos integer not null,
  saldo_pendiente integer not null,
  neto integer not null,
  creado_en timestamptz not null default now(),
  constraint liquidacion_colaboradores_pkey primary key (id),
  constraint liquidacion_colaboradores_liquidacion_colaborador_key unique (liquidacion_id, colaborador_id),
  constraint liquidacion_colaboradores_liquidacion_id_fkey foreign key (liquidacion_id)
    references public.liquidaciones_nomina (id) on delete restrict,
  constraint liquidacion_colaboradores_colaborador_id_fkey foreign key (colaborador_id)
    references public.colaboradores (id) on delete restrict,
  constraint liquidacion_colaboradores_valores_check check (
    servicios >= 0 and producido >= 0 and comision >= 0 and descuentos >= 0
    and saldo_pendiente >= 0 and neto >= 0
  )
);

create index idx_liquidacion_colaboradores_colaborador_id on public.liquidacion_colaboradores (colaborador_id);

comment on table public.liquidacion_colaboradores is
  'Detalle CONGELADO por colaborador de una liquidación (SCRUM-159): servicios, producido, comisión, descuentos (todos los tipos), saldo_pendiente y neto en el momento de liquidar. El desglose por tipo no se duplica aquí: se consulta en descuentos_colaborador por liquidacion_id. Inmutable, también para service_role.';
comment on constraint liquidacion_colaboradores_valores_check on public.liquidacion_colaboradores is
  'Invariante: neto = comision - descuentos + saldo_pendiente (neto=greatest(comision-descuentos,0), saldo_pendiente=greatest(descuentos-comision,0): exactamente una de las dos partes es cero).';

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
  'R12: qué liquidación de nómina cerró esta orden (null hasta que se liquida su quincena). Tras liquidar, la orden no se cancela NI se reasigna a otro colaborador (R12b).';

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
-- Una jornada reabierta no puede producir órdenes "huérfanas" sin
-- liquidar: BEFORE INSERT en ordenes_lavado, rechaza cualquier orden
-- cuya fecha caiga en una quincena que ya tiene liquidación.
-- ============================================================

create function public.impedir_orden_en_quincena_liquidada()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_rango public.rango_fechas;
begin
  v_rango := public.limites_quincena(new.fecha);

  if exists (
    select 1 from public.liquidaciones_nomina
    where periodo_inicio = v_rango.inicio and periodo_fin = v_rango.fin
  ) then
    raise exception 'La quincena % – % ya fue liquidada; no se pueden registrar órdenes en ese periodo',
      v_rango.inicio, v_rango.fin using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

comment on function public.impedir_orden_en_quincena_liquidada() is
  'Trigger BEFORE INSERT en ordenes_lavado (SCRUM-159): rechaza cualquier orden cuya fecha caiga en una quincena que ya tiene fila en liquidaciones_nomina.';

create trigger trg_ordenes_lavado_impedir_quincena_liquidada
  before insert on public.ordenes_lavado
  for each row execute function public.impedir_orden_en_quincena_liquidada();

-- ============================================================
-- Validación compartida por R13 (cancelar) y R14 (reasignar
-- colaborador, ambas en proteger_orden_lavado): la comisión del
-- colaborador en su quincena, SIN la orden indicada, no puede quedar
-- por debajo de sus descuentos tipo 'prestamo' aún no liquidados.
-- Jabón/multa/cxc NO protegen nada aquí: por diseño pueden superar la
-- comisión (ver fórmula real, encabezado de esta migración).
-- ============================================================

create function public.validar_cobertura_prestamos_colaborador(
  p_colaborador_id bigint,
  p_fecha_orden date,
  p_valor_orden integer,
  p_porcentaje_orden numeric,
  p_mensaje text
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_rango public.rango_fechas;
  v_comision_restante integer;
  v_prestamos_pendientes integer;
begin
  v_rango := public.limites_quincena(p_fecha_orden);
  v_comision_restante := public.comision_colaborador_periodo(p_colaborador_id, v_rango.inicio, v_rango.fin)
    - public.comision_orden(p_valor_orden, p_porcentaje_orden);
  v_prestamos_pendientes := public.descuentos_colaborador_periodo(p_colaborador_id, v_rango.inicio, v_rango.fin, 'prestamo');

  if v_comision_restante < v_prestamos_pendientes then
    raise exception '%', p_mensaje using errcode = 'check_violation';
  end if;
end;
$$;

comment on function public.validar_cobertura_prestamos_colaborador(bigint, date, integer, numeric, text) is
  'Comparte la validación de R13 (cancelar) y R14 (reasignar colaborador): la comisión del colaborador en su quincena, sin la orden indicada, no puede quedar por debajo de sus descuentos tipo ''prestamo'' aún no liquidados (jabón/multa/cxc no protegen nada aquí, por diseño pueden superar la comisión). Usada desde proteger_orden_lavado().';

-- Misma excepción razonada que limites_quincena/comision_orden/
-- comision_colaborador_periodo/descuentos_colaborador_periodo: la invoca
-- proteger_orden_lavado(), que puede correr como authenticated.
revoke execute on function public.validar_cobertura_prestamos_colaborador(bigint, date, integer, numeric, text) from public, anon;
grant execute on function public.validar_cobertura_prestamos_colaborador(bigint, date, integer, numeric, text) to authenticated, service_role;

-- ============================================================
-- proteger_orden_lavado(): conserva TODO lo de agregar_pagos_credito.sql
-- y agrega el caso especial de liquidacion_id, R12 (no cancelar tras
-- liquidar), R12b (no reasignar tras liquidar — hallazgo de revisión,
-- ver ADR 0006), R13 (cancelar no puede dejar la comisión por debajo de
-- los préstamos pendientes de la quincena) y R14 (lo mismo, al reasignar
-- la orden a otro colaborador).
-- ============================================================

create or replace function public.proteger_orden_lavado()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_porcentaje numeric(5, 4);
  v_solo_pago_o_liquidacion boolean;
begin
  -- R12b (hallazgo de revisión, SCRUM-159): reasignar el colaborador de
  -- una orden cuya quincena YA fue liquidada se rechaza siempre, sin
  -- importar el estado. Antes de esta validación, una orden 'terminada'
  -- (ni abierta ni cerrada para las reglas de abajo) podía reasignarse
  -- después de liquidada, dejando la liquidación ya congelada
  -- describiendo un colaborador que ya no es quien aparece en la orden.
  -- Va ANTES del caso especial de pago_credito_id/liquidacion_id: ese
  -- caso solo permite que liquidacion_id pase de null a un valor, nunca
  -- toca colaborador_id, así que no hay conflicto entre ambos.
  if new.colaborador_id <> old.colaborador_id and old.liquidacion_id is not null then
    raise exception 'Una orden de un periodo de nómina ya liquidado no se puede reasignar a otro colaborador'
      using errcode = 'check_violation';
  end if;

  -- Caso especial: pago_credito_id O liquidacion_id (nunca junto con
  -- ningún otro campo) pasan de null a un valor, incluso en una orden ya
  -- cerrada — ver ADR 0005 (pago_credito_id) y ADR 0006 (liquidacion_id).
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
  -- de abajo ya la detendría primero (ver ADR 0006).
  if new.estado = 'cancelada' and old.estado <> 'cancelada' and old.liquidacion_id is not null then
    raise exception 'Una orden de un periodo de nómina ya liquidado no se puede cancelar'
      using errcode = 'check_violation';
  end if;

  -- R13 (SCRUM-159): cancelar una orden ABIERTA (esta sí es alcanzable)
  -- que dejaría la comisión del colaborador en su quincena por debajo de
  -- sus préstamos ya registrados y aún no liquidados, se bloquea. Misma
  -- validación que R14 (reasignar), vía
  -- validar_cobertura_prestamos_colaborador(). Solo protege préstamos
  -- (jabón/multa/cxc pueden superar la comisión por diseño).
  if new.estado = 'cancelada' and old.estado in ('registrada', 'en_proceso') then
    perform public.validar_cobertura_prestamos_colaborador(
      old.colaborador_id, old.fecha, old.valor, old.porcentaje_comision,
      'Cancelar esta orden dejaría la comisión del colaborador en la quincena por debajo de sus préstamos ya registrados'
    );
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
    -- R14 (SCRUM-159): reasignar una orden ABIERTA a otro colaborador no
    -- puede dejar al colaborador ANTERIOR con comisión por debajo de sus
    -- préstamos ya registrados y aún no liquidados. Misma validación
    -- que R13 (cancelar); no aplica a 'terminada' (no es "abierta") — la
    -- reasignación de una orden ya liquidada (independiente de su
    -- estado) ya quedó bloqueada arriba por R12b.
    if old.estado in ('registrada', 'en_proceso') then
      perform public.validar_cobertura_prestamos_colaborador(
        old.colaborador_id, old.fecha, old.valor, old.porcentaje_comision,
        'Reasignar esta orden a otro colaborador dejaría la comisión del colaborador anterior en la quincena por debajo de sus préstamos ya registrados'
      );
    end if;

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
-- registrar_descuento(): atómico, con bloqueo de filas. Reemplaza a
-- registrar_prestamo() (ya no existe): un solo punto de entrada para
-- los 4 tipos de descuento. Solo 'prestamo' tiene límite por comisión
-- disponible; jabón/multa/cxc se registran sin ese límite.
-- ============================================================

create function public.registrar_descuento(
  p_colaborador_id bigint,
  p_tipo text,
  p_valor integer,
  p_fecha date,
  p_usuario_id bigint,
  p_observacion varchar(255) default null
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
  v_descuentos_previos integer;
  v_tope integer;
  v_disponible integer;
begin
  if p_valor is null or p_valor <= 0 then
    raise exception 'El valor del descuento debe ser mayor que cero' using errcode = 'check_violation';
  end if;

  if p_tipo not in ('prestamo', 'jabon', 'multa', 'cxc') then
    raise exception 'Tipo de descuento inválido: %', p_tipo using errcode = 'check_violation';
  end if;

  select estado into v_estado_colaborador
  from public.colaboradores
  where id = p_colaborador_id
  for update;

  if not found then
    raise exception 'El colaborador % no existe', p_colaborador_id using errcode = 'foreign_key_violation';
  end if;

  if v_estado_colaborador <> 'activo' then
    raise exception 'Solo se pueden registrar descuentos a colaboradores activos' using errcode = 'check_violation';
  end if;

  v_rango := public.limites_quincena(p_fecha);

  -- Mismo candado que liquidar_quincena() sobre esta quincena: serializa
  -- un descuento concurrente con una liquidación del mismo periodo.
  perform pg_advisory_xact_lock(public.clave_bloqueo_quincena(v_rango.inicio));

  if exists (
    select 1 from public.liquidaciones_nomina
    where periodo_inicio = v_rango.inicio and periodo_fin = v_rango.fin
  ) then
    raise exception 'La quincena % – % ya fue liquidada; no se pueden registrar más descuentos',
      v_rango.inicio, v_rango.fin using errcode = 'check_violation';
  end if;

  -- Bloquea los descuentos existentes de este colaborador/quincena: dos
  -- descuentos concurrentes del mismo colaborador se serializan, en vez
  -- de que ambos lean el mismo "disponible" y lo exploten entre los dos.
  perform 1 from public.descuentos_colaborador
    where colaborador_id = p_colaborador_id and fecha between v_rango.inicio and v_rango.fin
    for update;

  -- Solo 'prestamo' tiene límite: valor <= comisión acumulada menos
  -- TODOS los descuentos ya registrados en la quincena (de cualquier
  -- tipo), acotado por tope_prestamo_colaborador si es > 0. Jabón,
  -- multa y cxc se registran sin este límite (pueden superar la
  -- comisión; el faltante lo absorbe saldo_pendiente al liquidar).
  if p_tipo = 'prestamo' then
    v_comision := public.comision_colaborador_periodo(p_colaborador_id, v_rango.inicio, v_rango.fin);
    v_descuentos_previos := public.descuentos_colaborador_periodo(p_colaborador_id, v_rango.inicio, v_rango.fin);

    select tope_prestamo_colaborador into v_tope from public.parametros_negocio where id = 1;

    v_disponible := v_comision - v_descuentos_previos;
    if v_tope > 0 and v_tope < v_disponible then
      v_disponible := v_tope;
    end if;

    if p_valor > v_disponible then
      raise exception 'El préstamo supera el disponible de la quincena (comisión acumulada menos descuentos ya registrados, o el tope configurado)'
        using errcode = 'check_violation';
    end if;
  end if;

  insert into public.descuentos_colaborador (colaborador_id, fecha, tipo, valor, observacion, registrado_por)
  values (p_colaborador_id, p_fecha, p_tipo, p_valor, p_observacion, p_usuario_id)
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.registrar_descuento(bigint, text, integer, date, bigint, varchar) is
  'Registra un descuento (prestamo/jabon/multa/cxc) contra la quincena en curso de un colaborador activo. Solo tipo=''prestamo'' valida valor <= comisión acumulada menos TODOS los descuentos ya registrados, acotado por tope_prestamo_colaborador si es > 0; los demás tipos no tienen ese límite. Toma pg_advisory_xact_lock sobre la quincena (misma clave que liquidar_quincena()) antes de verificar si ya fue liquidada, y bloquea los descuentos existentes del colaborador/quincena para serializar descuentos concurrentes.';

revoke execute on function public.registrar_descuento(bigint, text, integer, date, bigint, varchar) from public, anon, authenticated;
grant execute on function public.registrar_descuento(bigint, text, integer, date, bigint, varchar) to service_role;

-- ============================================================
-- liquidar_quincena(): atómico, con bloqueo de filas. p_hoy es
-- parametrizable para poder probar con fechas de referencia fijas, sin
-- depender de now() — su default usa America/Bogota, NUNCA current_date
-- (current_date es UTC en Supabase: después de las 7 p. m. en Bogotá del
-- día 15, la base ya cree que es el 16, adelantando el cierre un día).
-- ============================================================

create function public.liquidar_quincena(
  p_inicio date,
  p_fin date,
  p_usuario_id bigint,
  p_hoy date default (now() at time zone 'America/Bogota')::date
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

  -- Mismo candado que registrar_descuento() sobre esta quincena:
  -- serializa esta liquidación con un descuento concurrente del mismo
  -- periodo, antes de cualquier verificación sobre si ya fue liquidada.
  perform pg_advisory_xact_lock(public.clave_bloqueo_quincena(p_inicio));

  if p_hoy < p_fin then
    raise exception 'No se puede liquidar una quincena que aún no ha terminado' using errcode = 'check_violation';
  end if;

  -- No se puede liquidar una quincena anterior a una ya liquidada: el
  -- cxc por saldo_pendiente que esta liquidación generaría caería en el
  -- día siguiente a p_fin (la quincena inmediatamente siguiente), que ya
  -- estaría cerrada — quedaría huérfano, sin ninguna liquidación futura
  -- que lo recoja.
  if exists (select 1 from public.liquidaciones_nomina where periodo_inicio > p_fin) then
    raise exception 'Ya existe una liquidación de un periodo posterior; no se puede liquidar una quincena anterior a una ya liquidada'
      using errcode = 'check_violation';
  end if;

  if exists (
    select 1 from public.ordenes_lavado
    where fecha between p_inicio and p_fin and estado in ('registrada', 'en_proceso')
    for update
  ) then
    raise exception 'Hay órdenes abiertas en el periodo; no se puede liquidar' using errcode = 'check_violation';
  end if;

  -- Bloquea el resto de órdenes y los descuentos del periodo antes de
  -- agregar nada, para que dos liquidaciones concurrentes del mismo
  -- periodo se serialicen (la segunda choca con el UNIQUE de periodo).
  perform 1 from public.ordenes_lavado where fecha between p_inicio and p_fin for update;
  perform 1 from public.descuentos_colaborador where fecha between p_inicio and p_fin for update;

  -- Defensa en profundidad SOLO para préstamos: si algún colaborador
  -- tiene préstamos por encima de su comisión del periodo, no se liquida
  -- nada. R13/R14 en proteger_orden_lavado ya deberían impedir que esto
  -- ocurra por las rutas normales. Jabón/multa/cxc NO entran en esta
  -- excepción: por diseño pueden superar la comisión (ver
  -- saldo_pendiente más abajo).
  if exists (
    select 1
    from (
      select colaborador_id from public.ordenes_lavado where fecha between p_inicio and p_fin
      union
      select colaborador_id from public.descuentos_colaborador where fecha between p_inicio and p_fin
    ) cp
    where public.descuentos_colaborador_periodo(cp.colaborador_id, p_inicio, p_fin, 'prestamo')
        > public.comision_colaborador_periodo(cp.colaborador_id, p_inicio, p_fin)
  ) then
    raise exception 'Hay colaboradores con préstamos superiores a su comisión del periodo; no se puede liquidar'
      using errcode = 'check_violation';
  end if;

  -- Detalle por colaborador sobre la UNIÓN de quienes tienen órdenes O
  -- descuentos en el periodo (un colaborador con jabón pero sin órdenes
  -- igual debe salir en la liquidación, con servicios/producido/comisión
  -- en cero). saldo_pendiente = lo que la comisión no alcanzó a cubrir;
  -- si es > 0, el INSERT final de esta misma sentencia lo convierte en
  -- un descuento tipo 'cxc' fechado el día siguiente a p_fin (el primer
  -- día de la quincena siguiente), para cobrarlo ahí.
  with colaboradores_periodo as (
    select colaborador_id from public.ordenes_lavado where fecha between p_inicio and p_fin
    union
    select colaborador_id from public.descuentos_colaborador where fecha between p_inicio and p_fin
  ), detalle as (
    select
      cp.colaborador_id,
      coalesce(count(o.id) filter (where o.estado <> 'cancelada'), 0) as servicios,
      coalesce(sum(o.valor) filter (where o.estado <> 'cancelada'), 0) as producido,
      public.comision_colaborador_periodo(cp.colaborador_id, p_inicio, p_fin) as comision,
      public.descuentos_colaborador_periodo(cp.colaborador_id, p_inicio, p_fin) as descuentos
    from colaboradores_periodo cp
    left join public.ordenes_lavado o
      on o.colaborador_id = cp.colaborador_id and o.fecha between p_inicio and p_fin
    group by cp.colaborador_id
  ), detalle_neto as (
    select
      colaborador_id, servicios, producido, comision, descuentos,
      greatest(comision - descuentos, 0) as neto,
      greatest(descuentos - comision, 0) as saldo_pendiente
    from detalle
  ), nueva_liquidacion as (
    insert into public.liquidaciones_nomina (periodo_inicio, periodo_fin, total_comision, total_descuentos, total_neto, liquidado_por)
    select p_inicio, p_fin, coalesce(sum(comision), 0), coalesce(sum(descuentos), 0), coalesce(sum(neto), 0), p_usuario_id
    from detalle_neto
    returning id
  ), detalle_insertado as (
    insert into public.liquidacion_colaboradores (
      liquidacion_id, colaborador_id, servicios, producido, comision, descuentos, saldo_pendiente, neto
    )
    select (select id from nueva_liquidacion), colaborador_id, servicios, producido, comision, descuentos, saldo_pendiente, neto
    from detalle_neto
    returning colaborador_id, saldo_pendiente
  )
  insert into public.descuentos_colaborador (colaborador_id, fecha, tipo, valor, observacion, registrado_por)
  select
    colaborador_id,
    p_fin + 1,
    'cxc',
    saldo_pendiente,
    format('Saldo pendiente de la quincena %s – %s', p_inicio, p_fin),
    p_usuario_id
  from detalle_insertado
  where saldo_pendiente > 0;

  select id into v_liquidacion_id
  from public.liquidaciones_nomina
  where periodo_inicio = p_inicio and periodo_fin = p_fin;

  update public.ordenes_lavado set liquidacion_id = v_liquidacion_id
    where fecha between p_inicio and p_fin;

  update public.descuentos_colaborador set liquidacion_id = v_liquidacion_id
    where fecha between p_inicio and p_fin;

  return v_liquidacion_id;
end;
$$;

comment on function public.liquidar_quincena(date, date, bigint, date) is
  'Todo o nada: toma pg_advisory_xact_lock sobre la quincena (misma clave que registrar_descuento()), valida el periodo (quincena real, ya terminada, ninguna posterior ya liquidada, sin órdenes abiertas, ningún colaborador con préstamos por encima de su comisión), bloquea sus filas, calcula el detalle por colaborador (unión de quienes tienen órdenes o descuentos; servicios/producido/comisión/descuentos/saldo_pendiente/neto, todo CONGELADO) en una sola sentencia que también crea el cxc de saldo_pendiente > 0 para la quincena siguiente, y marca ordenes_lavado/descuentos_colaborador con el liquidacion_id resultante. p_hoy (default America/Bogota, nunca UTC) permite probar con una fecha de referencia fija.';

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

grant select on public.descuentos_colaborador to authenticated;
create policy descuentos_colaborador_select_superadmin_administrador_soporte
  on public.descuentos_colaborador for select to authenticated
  using ((select public.rol_actual()) = any (array['superadmin', 'administrador', 'soporte']));
comment on policy descuentos_colaborador_select_superadmin_administrador_soporte on public.descuentos_colaborador is
  'Consultar descuentos de colaboradores: superadmin, administrador y soporte (igual patrón del ADR 0004).';

grant select on public.liquidacion_colaboradores to authenticated;
create policy liquidacion_colaboradores_select_superadmin_administrador_soporte
  on public.liquidacion_colaboradores for select to authenticated
  using ((select public.rol_actual()) = any (array['superadmin', 'administrador', 'soporte']));
comment on policy liquidacion_colaboradores_select_superadmin_administrador_soporte on public.liquidacion_colaboradores is
  'Consultar el detalle de liquidaciones: superadmin, administrador y soporte (igual patrón del ADR 0004).';
