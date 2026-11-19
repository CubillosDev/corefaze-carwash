begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

-- ============================================================
-- Fixtures
--
-- Esta prueba corre contra la base YA SEMBRADA por supabase/seed.sql
-- (supabase test db corre después de db reset, que incluye el seed), así
-- que todos los identificadores propios de esta prueba (códigos, números,
-- placas) usan rangos que el seed no toca, para no colisionar con sus
-- restricciones UNIQUE.
-- ============================================================

insert into public.usuarios (nombre, email, password_hash, rol) values
  ('Usuario Prueba', 'usuario@carwash.test', '$2b$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0', 'administrador');

-- El seed deja una jornada abierta: se cierra dentro de esta misma
-- transacción (se revierte con el rollback final) para poder abrir la
-- jornada propia de esta prueba, sin asumir que la base está vacía.
update public.jornadas set estado = 'cerrada', cerrada_en = now() where estado = 'abierta';

insert into public.jornadas (fecha, abierta_por) values
  (current_date, (select id from public.usuarios where email = 'usuario@carwash.test'));

insert into public.colaboradores (codigo, nombre, documento, telefono, porcentaje_comision, tipo_vinculacion) values
  (901, 'Colaborador Prueba', '2000000001', '3000000010', 0.37, 'fijo');

insert into public.clientes (nombre, documento, tipo, telefono) values
  ('Cliente Particular Uno', '1000000001', 'particular', '3000000001'),
  ('Cliente Particular Dos', '1000000002', 'particular', '3000000002');
insert into public.clientes (nombre, documento, tipo, telefono, credito_habilitado) values
  ('Empresa Credito', '900000001', 'empresa', '3000000003', true);

-- ZZB100 lo posee "Cliente Particular Dos"; tendrá una orden (para probar
-- que no se puede borrar ni el vehículo ni ese cliente).
insert into public.vehiculos (placa, tipo_vehiculo, cliente_id) values
  ('ZZB100', 'automovil', (select id from public.clientes where documento = '1000000002'));
-- ZZB101 lo posee "Cliente Particular Uno"; su orden se paga a crédito con
-- "Empresa Credito" (para probar que no se puede borrar ese cliente,
-- aunque no sea dueño de ningún vehículo).
insert into public.vehiculos (placa, tipo_vehiculo, cliente_id) values
  ('ZZB101', 'automovil', (select id from public.clientes where documento = '1000000001'));
-- ZZB102 no tiene ninguna orden: lo usan las pruebas de INSERT fallido de
-- más abajo, para que "una orden abierta por vehículo" no se adelante al
-- chequeo que cada una quiere aislar.
insert into public.vehiculos (placa, tipo_vehiculo, cliente_id) values
  ('ZZB102', 'automovil', (select id from public.clientes where documento = '1000000001'));

insert into public.servicios (numero, nombre) values (901, 'Lavado Prueba');
insert into public.tarifas_servicio (servicio_id, tipo_vehiculo, valor) values
  ((select id from public.servicios where numero = 901), 'automovil', 22000);

insert into public.ordenes_lavado (jornada_id, fecha, turno, vehiculo_id, servicio_id, colaborador_id, medio_pago, valor) values
  ((select id from public.jornadas where fecha = current_date), (select fecha from public.jornadas where fecha = current_date), 1,
   (select id from public.vehiculos where placa = 'ZZB100'),
   (select id from public.servicios where numero = 901),
   (select id from public.colaboradores where codigo = 901),
   'efectivo', 22000);

insert into public.ordenes_lavado (jornada_id, fecha, turno, vehiculo_id, servicio_id, colaborador_id, medio_pago, valor, cliente_id) values
  ((select id from public.jornadas where fecha = current_date), (select fecha from public.jornadas where fecha = current_date), 2,
   (select id from public.vehiculos where placa = 'ZZB101'),
   (select id from public.servicios where numero = 901),
   (select id from public.colaboradores where codigo = 901),
   'credito', 22000,
   (select id from public.clientes where documento = '900000001'));

-- ============================================================
-- Borrar un colaborador, servicio o vehículo con órdenes (23503)
-- ============================================================

select throws_ok(
  $$delete from public.colaboradores where codigo = 901$$,
  '23503',
  null,
  'borrar un colaborador con órdenes falla con 23503'
);

select throws_ok(
  $$delete from public.servicios where numero = 901$$,
  '23503',
  null,
  'borrar un servicio con órdenes falla con 23503'
);

select throws_ok(
  $$delete from public.vehiculos where placa = 'ZZB100'$$,
  '23503',
  null,
  'borrar un vehículo con órdenes falla con 23503'
);

-- ============================================================
-- Borrar un cliente con vehículos, o con órdenes a crédito (23503)
-- ============================================================

select throws_ok(
  $$delete from public.clientes where documento = '1000000002'$$,
  '23503',
  null,
  'borrar un cliente con vehículos falla con 23503'
);

select throws_ok(
  $$delete from public.clientes where documento = '900000001'$$,
  '23503',
  null,
  'borrar un cliente con órdenes a crédito falla con 23503'
);

-- ============================================================
-- Borrar un servicio SIN órdenes: funciona y borra sus tarifas (cascade)
-- ============================================================

insert into public.servicios (numero, nombre) values (902, 'Servicio Sin Ordenes Prueba');
insert into public.tarifas_servicio (servicio_id, tipo_vehiculo, valor) values
  ((select id from public.servicios where numero = 902), 'automovil', 25000);

create temporary table t_servicio_sin_ordenes as
  select id from public.servicios where numero = 902;

select lives_ok(
  $$delete from public.servicios where numero = 902$$,
  'borrar un servicio sin órdenes funciona'
);

select is_empty(
  $$select 1 from public.tarifas_servicio where servicio_id in (select id from t_servicio_sin_ordenes)$$,
  'las tarifas del servicio borrado se eliminan en cascada'
);

-- ============================================================
-- Borrar una orden (23001: no se eliminan, se cancelan)
-- ============================================================

select throws_ok(
  'delete from public.ordenes_lavado where turno = 1 and fecha = '
    || quote_literal((select fecha from public.jornadas where fecha = current_date)::text),
  '23001',
  null,
  'borrar una orden de lavado falla con 23001'
);

-- ============================================================
-- Insertar una orden con fecha distinta a la de su jornada (23503, FK compuesta)
-- ============================================================

select throws_ok(
  'insert into public.ordenes_lavado (jornada_id, fecha, turno, vehiculo_id, servicio_id, colaborador_id, medio_pago, valor) values ('
    || (select id from public.jornadas where fecha = current_date) || ', '
    || quote_literal(((select fecha from public.jornadas where fecha = current_date) - 1)::text) || ', 99, '
    || (select id from public.vehiculos where placa = 'ZZB102') || ', '
    || (select id from public.servicios where numero = 901) || ', '
    || (select id from public.colaboradores where codigo = 901) || ', '
    || quote_literal('efectivo') || ', 22000)',
  '23503',
  null,
  'insertar una orden con fecha distinta a la de su jornada falla con 23503'
);

-- ============================================================
-- Orden con un colaborador inexistente (23503)
-- ============================================================

select throws_ok(
  'insert into public.ordenes_lavado (jornada_id, fecha, turno, vehiculo_id, servicio_id, colaborador_id, medio_pago, valor) values ('
    || (select id from public.jornadas where fecha = current_date) || ', '
    || quote_literal((select fecha from public.jornadas where fecha = current_date)::text) || ', 98, '
    || (select id from public.vehiculos where placa = 'ZZB102') || ', '
    || (select id from public.servicios where numero = 901) || ', '
    || '999999, '
    || quote_literal('efectivo') || ', 22000)',
  '23503',
  null,
  'insertar una orden con un colaborador inexistente falla con 23503'
);

select * from finish();
rollback;
