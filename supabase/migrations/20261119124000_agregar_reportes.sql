-- ============================================================
-- Reportes y resumen de nómina en curso (diseño del panel: Reportes,
-- curva de ingresos del tablero y Nómina; ver ADR 0007).
--
-- Se agregan en SQL, no en la API: así no dependen del límite de 1.000 filas
-- de PostgREST (max_rows) y cada número sale de una sola consulta. Las
-- órdenes canceladas no cuentan. Los montos son los congelados en cada orden.
-- Solo las ejecuta service_role (la API las protege con JWT y rol).
-- ============================================================

-- Servicios e ingresos por día del periodo.
create function public.reporte_ventas_por_dia(p_desde date, p_hasta date)
returns table (fecha date, servicios integer, ingresos bigint)
language sql
stable
set search_path = ''
as $$
  select o.fecha, count(*)::integer, sum(o.valor)::bigint
  from public.ordenes_lavado o
  where o.fecha between p_desde and p_hasta and o.estado <> 'cancelada'
  group by o.fecha
  order by o.fecha;
$$;

-- Servicios e ingresos por servicio del catálogo en el periodo.
create function public.reporte_mix_servicios(p_desde date, p_hasta date)
returns table (servicio_id bigint, numero smallint, nombre varchar, categoria varchar, servicios integer, ingresos bigint)
language sql
stable
set search_path = ''
as $$
  select s.id, s.numero, s.nombre, s.categoria, count(*)::integer, sum(o.valor)::bigint
  from public.ordenes_lavado o
  join public.servicios s on s.id = o.servicio_id
  where o.fecha between p_desde and p_hasta and o.estado <> 'cancelada'
  group by s.id, s.numero, s.nombre, s.categoria
  order by sum(o.valor) desc, s.numero;
$$;

-- Servicios, ingresos y comisión por colaborador en el periodo. La comisión
-- usa comision_orden(), la regla única de redondeo de la nómina (ADR 0006).
create function public.reporte_colaboradores(p_desde date, p_hasta date)
returns table (colaborador_id bigint, codigo smallint, nombre varchar, servicios integer, ingresos bigint, comision bigint)
language sql
stable
set search_path = ''
as $$
  select c.id, c.codigo, c.nombre, count(*)::integer, sum(o.valor)::bigint,
         sum(public.comision_orden(o.valor, o.porcentaje_comision))::bigint
  from public.ordenes_lavado o
  join public.colaboradores c on c.id = o.colaborador_id
  where o.fecha between p_desde and p_hasta and o.estado <> 'cancelada'
  group by c.id, c.codigo, c.nombre
  order by sum(o.valor) desc, c.codigo;
$$;

-- Servicios e ingresos por hora de registro (hora de Bogotá) de las órdenes
-- de una fecha: la curva de ingresos acumulados del tablero.
create function public.reporte_ingresos_por_hora(p_fecha date)
returns table (hora integer, servicios integer, ingresos bigint)
language sql
stable
set search_path = ''
as $$
  select extract(hour from o.creado_en at time zone 'America/Bogota')::integer, count(*)::integer, sum(o.valor)::bigint
  from public.ordenes_lavado o
  where o.fecha = p_fecha and o.estado <> 'cancelada'
  group by 1
  order by 1;
$$;

-- Lo que hoy daría liquidar_quincena() para un periodo, sin escribir nada:
-- mismo universo (quien tiene órdenes o descuentos), mismas funciones de
-- comisión y descuentos, mismo neto y saldo pendiente. Además separa los
-- descuentos por tipo para mostrarlos.
create function public.resumen_nomina_periodo(p_inicio date, p_fin date)
returns table (
  colaborador_id bigint,
  codigo smallint,
  nombre varchar,
  servicios integer,
  producido bigint,
  comision integer,
  prestamos integer,
  jabon integer,
  multas integer,
  cxc integer,
  descuentos integer,
  neto integer,
  saldo_pendiente integer
)
language sql
stable
set search_path = ''
as $$
  with colaboradores_periodo as (
    select o.colaborador_id from public.ordenes_lavado o where o.fecha between p_inicio and p_fin
    union
    select d.colaborador_id from public.descuentos_colaborador d where d.fecha between p_inicio and p_fin
  ), detalle as (
    select
      cp.colaborador_id,
      coalesce(count(o.id) filter (where o.estado <> 'cancelada'), 0)::integer as servicios,
      coalesce(sum(o.valor) filter (where o.estado <> 'cancelada'), 0)::bigint as producido,
      public.comision_colaborador_periodo(cp.colaborador_id, p_inicio, p_fin) as comision,
      public.descuentos_colaborador_periodo(cp.colaborador_id, p_inicio, p_fin, 'prestamo') as prestamos,
      public.descuentos_colaborador_periodo(cp.colaborador_id, p_inicio, p_fin, 'jabon') as jabon,
      public.descuentos_colaborador_periodo(cp.colaborador_id, p_inicio, p_fin, 'multa') as multas,
      public.descuentos_colaborador_periodo(cp.colaborador_id, p_inicio, p_fin, 'cxc') as cxc,
      public.descuentos_colaborador_periodo(cp.colaborador_id, p_inicio, p_fin) as descuentos
    from colaboradores_periodo cp
    left join public.ordenes_lavado o
      on o.colaborador_id = cp.colaborador_id and o.fecha between p_inicio and p_fin
    group by cp.colaborador_id
  )
  select d.colaborador_id, c.codigo, c.nombre, d.servicios, d.producido, d.comision,
         d.prestamos, d.jabon, d.multas, d.cxc, d.descuentos,
         greatest(d.comision - d.descuentos, 0), greatest(d.descuentos - d.comision, 0)
  from detalle d
  join public.colaboradores c on c.id = d.colaborador_id
  order by c.codigo;
$$;

comment on function public.reporte_ventas_por_dia(date, date) is 'Servicios e ingresos por día (sin canceladas).';
comment on function public.reporte_mix_servicios(date, date) is 'Servicios e ingresos por servicio del catálogo (sin canceladas).';
comment on function public.reporte_colaboradores(date, date) is 'Servicios, ingresos y comisión (comision_orden) por colaborador (sin canceladas).';
comment on function public.reporte_ingresos_por_hora(date) is 'Servicios e ingresos por hora de registro en Bogotá, para la curva del tablero.';
comment on function public.resumen_nomina_periodo(date, date) is
  'Vista previa de liquidar_quincena(): mismo cálculo por colaborador, con los descuentos por tipo, sin escribir.';

revoke execute on function public.reporte_ventas_por_dia(date, date) from public, anon, authenticated;
revoke execute on function public.reporte_mix_servicios(date, date) from public, anon, authenticated;
revoke execute on function public.reporte_colaboradores(date, date) from public, anon, authenticated;
revoke execute on function public.reporte_ingresos_por_hora(date) from public, anon, authenticated;
revoke execute on function public.resumen_nomina_periodo(date, date) from public, anon, authenticated;
grant execute on function public.reporte_ventas_por_dia(date, date) to service_role;
grant execute on function public.reporte_mix_servicios(date, date) to service_role;
grant execute on function public.reporte_colaboradores(date, date) to service_role;
grant execute on function public.reporte_ingresos_por_hora(date) to service_role;
grant execute on function public.resumen_nomina_periodo(date, date) to service_role;
