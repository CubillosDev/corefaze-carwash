begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

-- ============================================================
-- historial_vehiculo() y conteo_ordenes_por_estado() (migración
-- 20261123120000_agregar_consultas_movil.sql, ADR 0011). Fixtures en
-- rangos que el seed no toca y en una fecha lejana. creado_en se fija a
-- mano: dentro de una transacción now() es el mismo para todas las filas
-- y no serviría para probar "el más reciente".
-- ============================================================

update public.jornadas set estado = 'cerrada', cerrada_en = now() where estado = 'abierta';

insert into public.jornadas (fecha, abierta_por) values ('2032-04-10', 1);

insert into public.colaboradores (codigo, nombre, documento, telefono, porcentaje_comision, tipo_vinculacion) values
  (940, 'Colaborador Consultas Movil', '2000000940', '3000000940', 0.40, 'fijo');

insert into public.clientes (nombre, documento, tipo, telefono) values
  ('Cliente Consultas Movil', '1000000940', 'particular', '3000000941');

insert into public.vehiculos (placa, tipo_vehiculo, cliente_id) values
  ('ZZH940', 'automovil', (select id from public.clientes where documento = '1000000940')),
  ('ZZH941', 'automovil', (select id from public.clientes where documento = '1000000940')),
  ('ZZH942', 'automovil', (select id from public.clientes where documento = '1000000940'));

insert into public.servicios (numero, nombre) values
  (940, 'Lavado Consultas Uno'),
  (941, 'Lavado Consultas Dos');

-- ZZH940: dos del servicio 940 y dos del 941 (empate), el más reciente
-- válido es del 941; la última orden (del 940) está cancelada y no cuenta.
-- ZZH941: tres del 940 y una del 941, más reciente: gana el que más tiene.
-- ZZH942: sin órdenes.
insert into public.ordenes_lavado
  (jornada_id, fecha, turno, vehiculo_id, servicio_id, colaborador_id, medio_pago, valor, estado, motivo, creado_en)
select j.id, j.fecha, t.turno, (select id from public.vehiculos where placa = t.placa),
       (select id from public.servicios where numero = t.servicio),
       (select id from public.colaboradores where codigo = 940),
       'efectivo', 20000, t.estado, t.motivo, ('2032-04-10 ' || t.hora || '-05')::timestamptz
from public.jornadas j
cross join (values
  (9401, 'ZZH940', 940, 'entregada', null, '09:00'),
  (9402, 'ZZH940', 941, 'entregada', null, '10:00'),
  (9403, 'ZZH940', 940, 'entregada', null, '11:00'),
  (9404, 'ZZH940', 941, 'terminada', null, '12:00'),
  (9405, 'ZZH940', 940, 'cancelada', 'Prueba de cancelada', '13:00'),
  (9411, 'ZZH941', 940, 'entregada', null, '09:00'),
  (9412, 'ZZH941', 940, 'entregada', null, '10:00'),
  (9413, 'ZZH941', 940, 'terminada', null, '11:00'),
  (9414, 'ZZH941', 941, 'registrada', null, '12:00')
) as t(turno, placa, servicio, estado, motivo, hora)
where j.fecha = '2032-04-10';

-- ---------------- historial_vehiculo ----------------
select results_eq(
  $$select * from public.historial_vehiculo((select id from public.vehiculos where placa = 'ZZH940'))$$,
  $$values (4, (select id from public.servicios where numero = 941), 'Lavado Consultas Dos'::varchar,
            '2032-04-10'::date, (select id from public.servicios where numero = 941))$$,
  'Sin canceladas; en empate de conteo el habitual es el tomado más recientemente'
);

select results_eq(
  $$select * from public.historial_vehiculo((select id from public.vehiculos where placa = 'ZZH941'))$$,
  $$values (4, (select id from public.servicios where numero = 941), 'Lavado Consultas Dos'::varchar,
            '2032-04-10'::date, (select id from public.servicios where numero = 940))$$,
  'El habitual es el de más órdenes aunque el último sea otro'
);

select results_eq(
  $$select * from public.historial_vehiculo((select id from public.vehiculos where placa = 'ZZH942'))$$,
  $$values (0, null::bigint, null::varchar, null::date, null::bigint)$$,
  'Un vehículo sin órdenes da una fila con 0 visitas y nulos'
);

-- ---------------- conteo_ordenes_por_estado ----------------
select results_eq(
  $$select * from public.conteo_ordenes_por_estado((select id from public.jornadas where fecha = '2032-04-10'))$$,
  $$values (1, 0, 2, 5, 1)$$,
  'Cuenta las órdenes de la jornada por fase'
);

select results_eq(
  $$select * from public.conteo_ordenes_por_estado(-1)$$,
  $$values (0, 0, 0, 0, 0)$$,
  'Una jornada sin órdenes da todo en 0'
);

-- ---------------- Privilegios EXECUTE ----------------
select is(has_function_privilege('anon', 'public.historial_vehiculo(bigint)', 'execute'), false,
  'anon NO ejecuta historial_vehiculo()');
select is(has_function_privilege('authenticated', 'public.historial_vehiculo(bigint)', 'execute'), false,
  'authenticated NO ejecuta historial_vehiculo()');
select is(has_function_privilege('service_role', 'public.historial_vehiculo(bigint)', 'execute'), true,
  'service_role SÍ ejecuta historial_vehiculo()');
select is(has_function_privilege('anon', 'public.conteo_ordenes_por_estado(bigint)', 'execute'), false,
  'anon NO ejecuta conteo_ordenes_por_estado()');
select is(has_function_privilege('authenticated', 'public.conteo_ordenes_por_estado(bigint)', 'execute'), false,
  'authenticated NO ejecuta conteo_ordenes_por_estado()');
select is(has_function_privilege('service_role', 'public.conteo_ordenes_por_estado(bigint)', 'execute'), true,
  'service_role SÍ ejecuta conteo_ordenes_por_estado()');

select is(
  (
    select count(*)::int
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    join lateral aclexplode(p.proacl) a on true
    where n.nspname = 'public' and p.proname = 'historial_vehiculo'
      and a.grantee = 0 and a.privilege_type = 'EXECUTE'
  ),
  0,
  'PUBLIC no tiene EXECUTE sobre historial_vehiculo (pg_proc.proacl)'
);
select is(
  (
    select count(*)::int
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    join lateral aclexplode(p.proacl) a on true
    where n.nspname = 'public' and p.proname = 'conteo_ordenes_por_estado'
      and a.grantee = 0 and a.privilege_type = 'EXECUTE'
  ),
  0,
  'PUBLIC no tiene EXECUTE sobre conteo_ordenes_por_estado (pg_proc.proacl)'
);

select * from finish();
rollback;
