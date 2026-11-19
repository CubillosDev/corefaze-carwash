begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

-- ============================================================
-- Fixtures (mismo criterio que reglas_negocio_test.sql: corre contra la
-- base ya sembrada, rangos de identificadores que el seed no toca).
-- ============================================================

insert into public.usuarios (nombre, email, password_hash, rol) values
  ('Usuario Pagos Credito', 'pagoscredito@carwash.test', '$2b$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0', 'administrador');

update public.jornadas set estado = 'cerrada', cerrada_en = now() where estado = 'abierta';
insert into public.jornadas (fecha, abierta_por) values
  (current_date, (select id from public.usuarios where email = 'pagoscredito@carwash.test'));

insert into public.colaboradores (codigo, nombre, documento, telefono, porcentaje_comision, tipo_vinculacion) values
  (920, 'Colaborador Pagos', '2000000920', '3000000920', 0.30, 'fijo');

insert into public.clientes (nombre, documento, tipo, telefono, credito_habilitado) values
  ('Empresa Pagos A', '900000920', 'empresa', '3000000921', true),
  ('Empresa Pagos B', '900000921', 'empresa', '3000000922', true);

insert into public.vehiculos (placa, tipo_vehiculo, cliente_id) values
  ('ZZC200', 'automovil', (select id from public.clientes where documento = '900000920'));

insert into public.servicios (numero, nombre) values (920, 'Lavado Pagos Credito');
insert into public.tarifas_servicio (servicio_id, tipo_vehiculo, valor) values
  ((select id from public.servicios where numero = 920), 'automovil', 20000);

-- Dos órdenes a crédito, entregadas, del mismo cliente (A): se pagan juntas.
insert into public.ordenes_lavado (jornada_id, fecha, turno, vehiculo_id, servicio_id, colaborador_id, medio_pago, cliente_id, valor, estado) values
  ((select id from public.jornadas where fecha = current_date), current_date, 920,
   (select id from public.vehiculos where placa = 'ZZC200'),
   (select id from public.servicios where numero = 920),
   (select id from public.colaboradores where codigo = 920),
   'credito', (select id from public.clientes where documento = '900000920'), 20000, 'entregada'),
  ((select id from public.jornadas where fecha = current_date), current_date, 921,
   (select id from public.vehiculos where placa = 'ZZC200'),
   (select id from public.servicios where numero = 920),
   (select id from public.colaboradores where codigo = 920),
   'credito', (select id from public.clientes where documento = '900000920'), 20000, 'entregada');

-- Orden del cliente B, a crédito, entregada: para "orden de otro cliente".
insert into public.ordenes_lavado (jornada_id, fecha, turno, vehiculo_id, servicio_id, colaborador_id, medio_pago, cliente_id, valor, estado) values
  ((select id from public.jornadas where fecha = current_date), current_date, 922,
   (select id from public.vehiculos where placa = 'ZZC200'),
   (select id from public.servicios where numero = 920),
   (select id from public.colaboradores where codigo = 920),
   'credito', (select id from public.clientes where documento = '900000921'), 20000, 'entregada');

-- Orden del cliente A, a EFECTIVO (no crédito), entregada: para "orden no a crédito".
insert into public.ordenes_lavado (jornada_id, fecha, turno, vehiculo_id, servicio_id, colaborador_id, medio_pago, valor, estado) values
  ((select id from public.jornadas where fecha = current_date), current_date, 923,
   (select id from public.vehiculos where placa = 'ZZC200'),
   (select id from public.servicios where numero = 920),
   (select id from public.colaboradores where codigo = 920),
   'efectivo', 20000, 'entregada');

-- Orden del cliente A, a crédito, NO entregada (registrada): para "orden no entregada".
insert into public.ordenes_lavado (jornada_id, fecha, turno, vehiculo_id, servicio_id, colaborador_id, medio_pago, cliente_id, valor, estado) values
  ((select id from public.jornadas where fecha = current_date), current_date, 924,
   (select id from public.vehiculos where placa = 'ZZC200'),
   (select id from public.servicios where numero = 920),
   (select id from public.colaboradores where codigo = 920),
   'credito', (select id from public.clientes where documento = '900000920'), 20000, 'registrada');

-- Orden del cliente A, a crédito, cancelada: para "orden cancelada".
insert into public.ordenes_lavado (jornada_id, fecha, turno, vehiculo_id, servicio_id, colaborador_id, medio_pago, cliente_id, valor, estado, motivo) values
  ((select id from public.jornadas where fecha = current_date), current_date, 925,
   (select id from public.vehiculos where placa = 'ZZC200'),
   (select id from public.servicios where numero = 920),
   (select id from public.colaboradores where codigo = 920),
   'credito', (select id from public.clientes where documento = '900000920'), 20000, 'cancelada', 'Prueba de fixture');

-- Orden del cliente A, a crédito, entregada, YA con un pago registrado
-- directamente (insertado completo, sin pasar por la RPC): para "orden ya
-- pagada" y "cancelar una orden pagada falla".
insert into public.pagos_credito (cliente_id, valor_total, registrado_por) values
  ((select id from public.clientes where documento = '900000920'), 20000,
   (select id from public.usuarios where email = 'pagoscredito@carwash.test'));

insert into public.ordenes_lavado (jornada_id, fecha, turno, vehiculo_id, servicio_id, colaborador_id, medio_pago, cliente_id, valor, estado, pago_credito_id) values
  ((select id from public.jornadas where fecha = current_date), current_date, 926,
   (select id from public.vehiculos where placa = 'ZZC200'),
   (select id from public.servicios where numero = 920),
   (select id from public.colaboradores where codigo = 920),
   'credito', (select id from public.clientes where documento = '900000920'), 20000, 'entregada',
   (select id from public.pagos_credito where cliente_id = (select id from public.clientes where documento = '900000920')));

-- ============================================================
-- Pago feliz con 2 órdenes
-- ============================================================

select lives_ok(
  format(
    'select public.registrar_pago_credito(%s, array[%s, %s], %s)',
    (select id from public.clientes where documento = '900000920'),
    (select id from public.ordenes_lavado where turno = 920),
    (select id from public.ordenes_lavado where turno = 921),
    (select id from public.usuarios where email = 'pagoscredito@carwash.test')
  ),
  'pago feliz con 2 órdenes del mismo cliente no lanza excepción'
);

select results_eq(
  format(
    'select pago_credito_id is not null from public.ordenes_lavado where turno in (%s, %s)',
    920, 921
  ),
  $$values (true), (true)$$,
  'ambas órdenes quedaron marcadas con el mismo pago (no null)'
);

select is(
  (select valor_total from public.pagos_credito
     where id = (select pago_credito_id from public.ordenes_lavado where turno = 920)),
  40000,
  'valor_total del pago es la suma de las dos órdenes (20000 + 20000)'
);

-- ============================================================
-- Casos que deben fallar, uno por uno (cada cual en su propia orden,
-- ninguna tocada por el pago feliz de arriba)
-- ============================================================

select throws_ok(
  format(
    'select public.registrar_pago_credito(%s, array[%s], %s)',
    (select id from public.clientes where documento = '900000920'), -- cliente A
    (select id from public.ordenes_lavado where turno = 922), -- orden es del cliente B
    (select id from public.usuarios where email = 'pagoscredito@carwash.test')
  ),
  null, null, 'pagar una orden de otro cliente falla'
);

select throws_ok(
  format(
    'select public.registrar_pago_credito(%s, array[%s], %s)',
    (select id from public.clientes where documento = '900000920'),
    (select id from public.ordenes_lavado where turno = 923), -- es a efectivo
    (select id from public.usuarios where email = 'pagoscredito@carwash.test')
  ),
  null, null, 'pagar una orden que no es a crédito falla'
);

select throws_ok(
  format(
    'select public.registrar_pago_credito(%s, array[%s], %s)',
    (select id from public.clientes where documento = '900000920'),
    (select id from public.ordenes_lavado where turno = 924), -- está registrada, no entregada
    (select id from public.usuarios where email = 'pagoscredito@carwash.test')
  ),
  null, null, 'pagar una orden que no está entregada falla'
);

select throws_ok(
  format(
    'select public.registrar_pago_credito(%s, array[%s], %s)',
    (select id from public.clientes where documento = '900000920'),
    (select id from public.ordenes_lavado where turno = 925), -- cancelada
    (select id from public.usuarios where email = 'pagoscredito@carwash.test')
  ),
  null, null, 'pagar una orden cancelada falla'
);

select throws_ok(
  format(
    'select public.registrar_pago_credito(%s, array[%s], %s)',
    (select id from public.clientes where documento = '900000920'),
    (select id from public.ordenes_lavado where turno = 926), -- ya tiene pago
    (select id from public.usuarios where email = 'pagoscredito@carwash.test')
  ),
  null, null, 'pagar una orden que ya tiene un pago registrado falla'
);

select throws_ok(
  format(
    'select public.registrar_pago_credito(%s, array[]::bigint[], %s)',
    (select id from public.clientes where documento = '900000920'),
    (select id from public.usuarios where email = 'pagoscredito@carwash.test')
  ),
  null, null, 'un arreglo vacío de órdenes falla'
);

select throws_ok(
  format(
    'select public.registrar_pago_credito(%s, array[%s, %s], %s)',
    (select id from public.clientes where documento = '900000920'),
    (select id from public.ordenes_lavado where turno = 924),
    (select id from public.ordenes_lavado where turno = 924),
    (select id from public.usuarios where email = 'pagoscredito@carwash.test')
  ),
  null, null, 'un arreglo con ids repetidos falla'
);

-- ============================================================
-- Cancelar una orden pagada falla (R11 — hoy redundante con que
-- 'entregada' ya es terminal, pero la BD la bloquea igual: ver ADR).
-- ============================================================

select throws_ok(
  format(
    $$update public.ordenes_lavado set estado = 'cancelada', motivo = 'intento' where turno = %s$$,
    926
  ),
  null, null, 'cancelar una orden con un pago de crédito registrado falla'
);

-- ============================================================
-- authenticated nunca puede tocar pago_credito_id directamente (columna
-- sin GRANT), aunque sea superadmin con acceso de escritura a la tabla.
-- ============================================================

set local role authenticated;
select set_config('request.jwt.claims', '{"app_metadata":{"rol":"superadmin"}}', true);
select throws_ok(
  format('update public.ordenes_lavado set pago_credito_id = 1 where turno = %s', 924),
  '42501', null, 'authenticated no puede asignar pago_credito_id directamente (sin GRANT de columna)'
);
reset role;

-- ============================================================
-- pagos_credito es inmutable incluso para service_role
-- ============================================================

set local role service_role;
select throws_ok(
  format('update public.pagos_credito set valor_total = 1 where id = %s',
    (select pago_credito_id from public.ordenes_lavado where turno = 926)),
  '42501', null, 'ni service_role puede modificar un pago de crédito'
);
select throws_ok(
  format('delete from public.pagos_credito where id = %s',
    (select pago_credito_id from public.ordenes_lavado where turno = 926)),
  '42501', null, 'ni service_role puede eliminar un pago de crédito'
);
reset role;

-- ============================================================
-- Privilegios de la función: service_role sí, anon/authenticated no
-- ============================================================

select is(
  has_function_privilege('service_role', 'public.registrar_pago_credito(bigint, bigint[], bigint)', 'execute'),
  true, 'service_role SÍ puede ejecutar registrar_pago_credito()'
);
select is(
  has_function_privilege('authenticated', 'public.registrar_pago_credito(bigint, bigint[], bigint)', 'execute'),
  false, 'authenticated NO puede ejecutar registrar_pago_credito()'
);
select is(
  has_function_privilege('anon', 'public.registrar_pago_credito(bigint, bigint[], bigint)', 'execute'),
  false, 'anon NO puede ejecutar registrar_pago_credito()'
);

-- ============================================================
-- RLS por rol de pagos_credito: consultar los tres roles operativos,
-- pendiente y anon sin acceso.
-- ============================================================

set local role authenticated;
select set_config('request.jwt.claims', '{"app_metadata":{"rol":"superadmin"}}', true);
select isnt_empty($$select id from public.pagos_credito$$, 'superadmin SÍ puede consultar pagos_credito');

select set_config('request.jwt.claims', '{"app_metadata":{"rol":"administrador"}}', true);
select isnt_empty($$select id from public.pagos_credito$$, 'administrador SÍ puede consultar pagos_credito');

select set_config('request.jwt.claims', '{"app_metadata":{"rol":"soporte"}}', true);
select isnt_empty($$select id from public.pagos_credito$$, 'soporte SÍ puede consultar pagos_credito');

select set_config('request.jwt.claims', '{"app_metadata":{"rol":"pendiente"}}', true);
select is_empty($$select id from public.pagos_credito$$, 'pendiente NO puede consultar pagos_credito');
reset role;

set local role anon;
select throws_ok($$select 1 from public.pagos_credito limit 1$$, '42501', null, 'anon no puede leer pagos_credito');
reset role;

select * from finish();
rollback;
