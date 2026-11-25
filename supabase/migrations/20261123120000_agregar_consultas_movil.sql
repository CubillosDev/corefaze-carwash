-- ============================================================
-- Consultas agregadas para la recepción en la app móvil (ADR 0011).
--
-- La app calculaba el historial de un vehículo y el conteo de órdenes de la
-- jornada descargando listas completas y filtrando en el teléfono; con el
-- límite de 1.000 filas de PostgREST (max_rows) esas listas llegaban
-- truncadas. Aquí se agregan en SQL y cada respuesta es una sola fila.
-- Solo las ejecuta service_role (la API las protege con JWT y rol).
-- ============================================================

-- Historial de un vehículo, sin traer sus órdenes: visitas (órdenes no
-- canceladas), el último servicio y su fecha, y el servicio habitual (el de
-- más órdenes no canceladas; en empate, el tomado más recientemente).
-- Siempre devuelve una fila: un vehículo sin órdenes da visitas = 0 y nulos.
create function public.historial_vehiculo(p_vehiculo_id bigint)
returns table (
  visitas integer,
  ultimo_servicio_id bigint,
  ultimo_servicio_nombre varchar,
  ultima_fecha date,
  servicio_habitual_id bigint
)
language sql
stable
set search_path = ''
as $$
  with validas as (
    select o.id, o.servicio_id, o.fecha, o.creado_en
    from public.ordenes_lavado o
    where o.vehiculo_id = p_vehiculo_id and o.estado <> 'cancelada'
  ), ultima as (
    select v.servicio_id, v.fecha
    from validas v
    order by v.creado_en desc, v.id desc
    limit 1
  ), habitual as (
    select v.servicio_id
    from validas v
    group by v.servicio_id
    order by count(*) desc, max(v.creado_en) desc, max(v.id) desc
    limit 1
  )
  select
    (select count(*) from validas)::integer,
    u.servicio_id,
    s.nombre,
    u.fecha,
    (select h.servicio_id from habitual h)
  from (select 1) as una_fila
  left join ultima u on true
  left join public.servicios s on s.id = u.servicio_id;
$$;

-- Cuántas órdenes tiene una jornada en cada fase. Siempre devuelve una fila
-- (todo en 0 si la jornada no tiene órdenes o no existe).
create function public.conteo_ordenes_por_estado(p_jornada_id bigint)
returns table (
  registrada integer,
  en_proceso integer,
  terminada integer,
  entregada integer,
  cancelada integer
)
language sql
stable
set search_path = ''
as $$
  select
    count(*) filter (where o.estado = 'registrada')::integer,
    count(*) filter (where o.estado = 'en_proceso')::integer,
    count(*) filter (where o.estado = 'terminada')::integer,
    count(*) filter (where o.estado = 'entregada')::integer,
    count(*) filter (where o.estado = 'cancelada')::integer
  from public.ordenes_lavado o
  where o.jornada_id = p_jornada_id;
$$;

comment on function public.historial_vehiculo(bigint) is
  'Visitas (sin canceladas), último servicio, última fecha y servicio habitual de un vehículo (ADR 0011).';
comment on function public.conteo_ordenes_por_estado(bigint) is
  'Órdenes de una jornada por fase, en una sola fila (ADR 0011).';

revoke execute on function public.historial_vehiculo(bigint) from public, anon, authenticated;
revoke execute on function public.conteo_ordenes_por_estado(bigint) from public, anon, authenticated;
grant execute on function public.historial_vehiculo(bigint) to service_role;
grant execute on function public.conteo_ordenes_por_estado(bigint) to service_role;
