begin;
create extension if not exists pgtap with schema extensions;
select plan(36);

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
  (901, 'Colaborador Uno', '2000000001', '3000000010', 0.30, 'fijo'),
  (902, 'Colaborador Dos', '2000000002', '3000000011', 0.40, 'fijo'),
  (910, 'Colaborador Tres', '2000000010', '3000000020', 0.45, 'fijo');

insert into public.clientes (nombre, documento, tipo, telefono) values
  ('Cliente Particular', '1000000001', 'particular', '3000000001');
insert into public.clientes (nombre, documento, tipo, telefono, credito_habilitado) values
  ('Empresa Credito', '900000001', 'empresa', '3000000002', true);

insert into public.vehiculos (placa, tipo_vehiculo, cliente_id) values
  ('ZZB200', 'automovil', (select id from public.clientes where documento = '1000000001')),
  ('ZZB201', 'automovil', (select id from public.clientes where documento = '1000000001'));

insert into public.servicios (numero, nombre) values (901, 'Lavado Prueba');
insert into public.tarifas_servicio (servicio_id, tipo_vehiculo, valor) values
  ((select id from public.servicios where numero = 901), 'automovil', 22000);

-- Orden base (turno 1), abierta, en el vehículo ZZB200. Se usa en las
-- pruebas de inmutabilidad (31-33).
insert into public.ordenes_lavado (jornada_id, fecha, turno, vehiculo_id, servicio_id, colaborador_id, medio_pago, valor) values
  ((select id from public.jornadas where fecha = current_date), (select fecha from public.jornadas where fecha = current_date), 1,
   (select id from public.vehiculos where placa = 'ZZB200'),
   (select id from public.servicios where numero = 901),
   (select id from public.colaboradores where codigo = 901),
   'efectivo', 22000);

-- ============================================================
-- CHECK de cada enumeración con un valor inválido (23514)
-- ============================================================

select throws_ok(
  $$insert into public.usuarios (nombre, email, password_hash, rol)
    values ('Rol Invalido', 'rolinvalido@carwash.test', '$2b$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0', 'dueno')$$,
  '23514',
  null,
  'rol fuera del catálogo (usuarios) falla con 23514'
);

select throws_ok(
  $$insert into public.colaboradores (codigo, nombre, documento, telefono, porcentaje_comision, tipo_vinculacion)
    values (903, 'Colaborador Invalido', '2000000003', '3000000012', 0.3, 'temporal')$$,
  '23514',
  null,
  'tipo_vinculacion fuera del catálogo (colaboradores) falla con 23514'
);

select throws_ok(
  $$insert into public.colaboradores (codigo, nombre, documento, telefono, porcentaje_comision, tipo_vinculacion, estado)
    values (904, 'Colaborador Invalido 2', '2000000004', '3000000013', 0.3, 'fijo', 'suspendido')$$,
  '23514',
  null,
  'estado fuera del catálogo (colaboradores) falla con 23514'
);

select throws_ok(
  'insert into public.tarifas_servicio (servicio_id, tipo_vehiculo, valor) values ('
    || (select id from public.servicios where numero = 901) || ', ''buseta'', 20000)',
  '23514',
  null,
  'tipo_vehiculo fuera del catálogo (tarifas_servicio) falla con 23514'
);

select throws_ok(
  $$insert into public.clientes (nombre, documento, tipo, telefono)
    values ('Cliente Invalido', '1000000099', 'juridica', '3000000099')$$,
  '23514',
  null,
  'tipo fuera del catálogo (clientes) falla con 23514'
);

select throws_ok(
  $$insert into public.clientes (nombre, documento, tipo, telefono, estado)
    values ('Cliente Invalido 2', '1000000098', 'particular', '3000000098', 'suspendido')$$,
  '23514',
  null,
  'estado fuera del catálogo (clientes) falla con 23514'
);

select throws_ok(
  'insert into public.vehiculos (placa, tipo_vehiculo, cliente_id) values (''ZZB999'', ''buseta'', '
    || (select id from public.clientes where documento = '1000000001') || ')',
  '23514',
  null,
  'tipo_vehiculo fuera del catálogo (vehiculos) falla con 23514'
);

select throws_ok(
  $$insert into public.jornadas (fecha, estado, cerrada_en) values ('2000-01-01', 'pausada', now())$$,
  '23514',
  null,
  'estado fuera del catálogo (jornadas) falla con 23514'
);

select throws_ok(
  'insert into public.ordenes_lavado (jornada_id, fecha, turno, vehiculo_id, servicio_id, colaborador_id, medio_pago, valor) values ('
    || (select id from public.jornadas where fecha = current_date) || ', '
    || quote_literal((select fecha from public.jornadas where fecha = current_date)::text) || ', 50, '
    || (select id from public.vehiculos where placa = 'ZZB200') || ', '
    || (select id from public.servicios where numero = 901) || ', '
    || (select id from public.colaboradores where codigo = 901) || ', '
    || quote_literal('cheque') || ', 22000)',
  '23514',
  null,
  'medio_pago fuera del catálogo (ordenes_lavado) falla con 23514'
);

select throws_ok(
  'insert into public.ordenes_lavado (jornada_id, fecha, turno, vehiculo_id, servicio_id, colaborador_id, medio_pago, valor, estado) values ('
    || (select id from public.jornadas where fecha = current_date) || ', '
    || quote_literal((select fecha from public.jornadas where fecha = current_date)::text) || ', 51, '
    || (select id from public.vehiculos where placa = 'ZZB200') || ', '
    || (select id from public.servicios where numero = 901) || ', '
    || (select id from public.colaboradores where codigo = 901) || ', '
    || quote_literal('efectivo') || ', 22000, '
    || quote_literal('pendiente') || ')',
  '23514',
  null,
  'estado fuera del catálogo (ordenes_lavado) falla con 23514'
);

-- ============================================================
-- Duplicados (23505)
-- ============================================================

select throws_ok(
  'insert into public.ordenes_lavado (jornada_id, fecha, turno, vehiculo_id, servicio_id, colaborador_id, medio_pago, valor) values ('
    || (select id from public.jornadas where fecha = current_date) || ', '
    || quote_literal((select fecha from public.jornadas where fecha = current_date)::text) || ', 1, '
    || (select id from public.vehiculos where placa = 'ZZB201') || ', '
    || (select id from public.servicios where numero = 901) || ', '
    || (select id from public.colaboradores where codigo = 902) || ', '
    || quote_literal('efectivo') || ', 22000)',
  '23505',
  null,
  'UNIQUE (fecha, turno) en ordenes_lavado se respeta'
);

select throws_ok(
  'insert into public.vehiculos (placa, tipo_vehiculo, cliente_id) values (''ZZB200'', ''automovil'', '
    || (select id from public.clientes where documento = '1000000001') || ')',
  '23505',
  null,
  'placa duplicada en vehiculos falla con 23505'
);

select throws_ok(
  $$insert into public.clientes (nombre, documento, tipo, telefono)
    values ('Otro Cliente', '1000000001', 'particular', '3000000097')$$,
  '23505',
  null,
  'documento duplicado en clientes falla con 23505'
);

select throws_ok(
  $$insert into public.colaboradores (codigo, nombre, documento, telefono, porcentaje_comision, tipo_vinculacion)
    values (905, 'Otro Colaborador', '2000000001', '3000000014', 0.35, 'fijo')$$,
  '23505',
  null,
  'documento duplicado en colaboradores falla con 23505'
);

select throws_ok(
  'insert into public.tarifas_servicio (servicio_id, tipo_vehiculo, valor) values ('
    || (select id from public.servicios where numero = 901) || ', ''automovil'', 30000)',
  '23505',
  null,
  'tarifa duplicada (servicio_id, tipo_vehiculo) falla con 23505'
);

select throws_ok(
  'insert into public.jornadas (fecha) values ('
    || quote_literal((select fecha from public.jornadas where fecha = current_date)::text) || ')',
  '23505',
  null,
  'jornada duplicada para la misma fecha falla con 23505'
);

-- ============================================================
-- Una sola jornada abierta / una sola orden abierta por vehículo (23505)
-- ============================================================

select throws_ok(
  $$insert into public.jornadas (fecha) values (current_date + 1)$$,
  '23505',
  null,
  'no puede haber dos jornadas abiertas a la vez'
);

select throws_ok(
  'insert into public.ordenes_lavado (jornada_id, fecha, turno, vehiculo_id, servicio_id, colaborador_id, medio_pago, valor) values ('
    || (select id from public.jornadas where fecha = current_date) || ', '
    || quote_literal((select fecha from public.jornadas where fecha = current_date)::text) || ', 2, '
    || (select id from public.vehiculos where placa = 'ZZB200') || ', '
    || (select id from public.servicios where numero = 901) || ', '
    || (select id from public.colaboradores where codigo = 901) || ', '
    || quote_literal('efectivo') || ', 22000)',
  '23505',
  null,
  'no puede haber dos órdenes abiertas para el mismo vehículo'
);

-- ============================================================
-- Placa de moto en un automóvil y viceversa (23514)
-- ============================================================

select throws_ok(
  'insert into public.vehiculos (placa, tipo_vehiculo, cliente_id) values (''ZZN10A'', ''automovil'', '
    || (select id from public.clientes where documento = '1000000001') || ')',
  '23514',
  null,
  'placa de moto en un vehículo tipo automóvil falla con 23514'
);

select throws_ok(
  'insert into public.vehiculos (placa, tipo_vehiculo, cliente_id) values (''ZZB202'', ''moto_hasta_150cc'', '
    || (select id from public.clientes where documento = '1000000001') || ')',
  '23514',
  null,
  'placa de carro en un vehículo tipo moto falla con 23514'
);

-- ============================================================
-- Crédito sin cliente / cliente con un medio distinto de crédito (23514)
-- ============================================================

select throws_ok(
  'insert into public.ordenes_lavado (jornada_id, fecha, turno, vehiculo_id, servicio_id, colaborador_id, medio_pago, valor) values ('
    || (select id from public.jornadas where fecha = current_date) || ', '
    || quote_literal((select fecha from public.jornadas where fecha = current_date)::text) || ', 52, '
    || (select id from public.vehiculos where placa = 'ZZB201') || ', '
    || (select id from public.servicios where numero = 901) || ', '
    || (select id from public.colaboradores where codigo = 901) || ', '
    || quote_literal('credito') || ', 22000)',
  '23514',
  null,
  'medio_pago credito sin cliente_id falla con 23514'
);

select throws_ok(
  'insert into public.ordenes_lavado (jornada_id, fecha, turno, vehiculo_id, servicio_id, colaborador_id, medio_pago, valor, cliente_id) values ('
    || (select id from public.jornadas where fecha = current_date) || ', '
    || quote_literal((select fecha from public.jornadas where fecha = current_date)::text) || ', 53, '
    || (select id from public.vehiculos where placa = 'ZZB201') || ', '
    || (select id from public.servicios where numero = 901) || ', '
    || (select id from public.colaboradores where codigo = 901) || ', '
    || quote_literal('efectivo') || ', 22000, '
    || (select id from public.clientes where documento = '900000001') || ')',
  '23514',
  null,
  'cliente_id presente con un medio_pago distinto de credito falla con 23514'
);

-- ============================================================
-- Cancelar sin motivo / motivo en una orden no cancelada (23514)
-- ============================================================

select throws_ok(
  'insert into public.ordenes_lavado (jornada_id, fecha, turno, vehiculo_id, servicio_id, colaborador_id, medio_pago, valor, estado) values ('
    || (select id from public.jornadas where fecha = current_date) || ', '
    || quote_literal((select fecha from public.jornadas where fecha = current_date)::text) || ', 54, '
    || (select id from public.vehiculos where placa = 'ZZB201') || ', '
    || (select id from public.servicios where numero = 901) || ', '
    || (select id from public.colaboradores where codigo = 901) || ', '
    || quote_literal('efectivo') || ', 22000, '
    || quote_literal('cancelada') || ')',
  '23514',
  null,
  'cancelar una orden sin motivo falla con 23514'
);

select throws_ok(
  'insert into public.ordenes_lavado (jornada_id, fecha, turno, vehiculo_id, servicio_id, colaborador_id, medio_pago, valor, motivo) values ('
    || (select id from public.jornadas where fecha = current_date) || ', '
    || quote_literal((select fecha from public.jornadas where fecha = current_date)::text) || ', 55, '
    || (select id from public.vehiculos where placa = 'ZZB201') || ', '
    || (select id from public.servicios where numero = 901) || ', '
    || (select id from public.colaboradores where codigo = 901) || ', '
    || quote_literal('efectivo') || ', 22000, '
    || quote_literal('No debería tener motivo') || ')',
  '23514',
  null,
  'una orden no cancelada con motivo falla con 23514'
);

-- ============================================================
-- credito_habilitado = true en un cliente particular (23514)
-- ============================================================

select throws_ok(
  $$insert into public.clientes (nombre, documento, tipo, telefono, credito_habilitado)
    values ('Particular Credito Invalido', '1000000097', 'particular', '3000000096', true)$$,
  '23514',
  null,
  'credito_habilitado=true en un cliente particular falla con 23514'
);

-- ============================================================
-- Código de colaborador repetido entre activos (23505);
-- el mismo código con el titular anterior inactivo: permitido
-- ============================================================

select throws_ok(
  $$insert into public.colaboradores (codigo, nombre, documento, telefono, porcentaje_comision, tipo_vinculacion)
    values (901, 'Suplantador', '2000000005', '3000000015', 0.3, 'fijo')$$,
  '23505',
  null,
  'código repetido entre colaboradores activos falla con 23505'
);

update public.colaboradores set estado = 'inactivo', inactivo_desde = now() where codigo = 902;

select lives_ok(
  $$insert into public.colaboradores (codigo, nombre, documento, telefono, porcentaje_comision, tipo_vinculacion)
    values (902, 'Reemplazo', '2000000006', '3000000016', 0.3, 'fijo')$$,
  'el mismo código con el titular anterior inactivo sí se permite'
);

-- ============================================================
-- Contraseña que no es bcrypt y email con mayúsculas en usuarios (23514)
-- ============================================================

select throws_ok(
  $$insert into public.usuarios (nombre, email, password_hash, rol)
    values ('Password Invalido', 'passwordinvalido@carwash.test', 'no-es-un-hash-bcrypt', 'soporte')$$,
  '23514',
  null,
  'password_hash que no es bcrypt falla con 23514'
);

select throws_ok(
  $$insert into public.usuarios (nombre, email, password_hash, rol)
    values ('Email Mayusculas', 'EMAIL.MAYUSCULAS@carwash.test', '$2b$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0', 'soporte')$$,
  '23514',
  null,
  'email con mayúsculas falla con 23514'
);

-- ============================================================
-- Órdenes: inmutabilidad y reglas de porcentaje_comision
-- ============================================================

-- Orden ya cerrada (entregada), insertada directo para la prueba de
-- inmutabilidad: la máquina de estados (R9) es de la API, la BD solo
-- protege que una orden cerrada no se modifique (R10).
insert into public.ordenes_lavado (jornada_id, fecha, turno, vehiculo_id, servicio_id, colaborador_id, medio_pago, valor, estado) values
  ((select id from public.jornadas where fecha = current_date), (select fecha from public.jornadas where fecha = current_date), 60,
   (select id from public.vehiculos where placa = 'ZZB201'),
   (select id from public.servicios where numero = 901),
   (select id from public.colaboradores where codigo = 901),
   'efectivo', 22000, 'entregada');

select throws_ok(
  'update public.ordenes_lavado set observaciones = ''intento de editar'' where turno = 60',
  '23514',
  null,
  'modificar una orden entregada falla con 23514'
);

select throws_ok(
  'update public.ordenes_lavado set valor = 99999 where turno = 1',
  '23514',
  null,
  'cambiar el valor de una orden abierta falla con 23514'
);

insert into public.servicios (numero, nombre) values (902, 'Servicio Dos Prueba');

select throws_ok(
  'update public.ordenes_lavado set servicio_id = (select id from public.servicios where numero = 902) where turno = 1',
  '23514',
  null,
  'cambiar el servicio de una orden abierta falla con 23514'
);

select throws_ok(
  'update public.ordenes_lavado set porcentaje_comision = 0.99 where turno = 1',
  '23514',
  null,
  'cambiar el porcentaje_comision directamente en una orden abierta falla con 23514'
);

-- El % se copia del colaborador al crear, ignorando el enviado (0.99 ≠ 0.30).
insert into public.ordenes_lavado (jornada_id, fecha, turno, vehiculo_id, servicio_id, colaborador_id, medio_pago, valor, porcentaje_comision) values
  ((select id from public.jornadas where fecha = current_date), (select fecha from public.jornadas where fecha = current_date), 61,
   (select id from public.vehiculos where placa = 'ZZB201'),
   (select id from public.servicios where numero = 901),
   (select id from public.colaboradores where codigo = 901),
   'efectivo', 22000, 0.99);

select is(
  (select porcentaje_comision from public.ordenes_lavado where turno = 61),
  (select porcentaje_comision from public.colaboradores where codigo = 901),
  'el porcentaje_comision enviado al crear se ignora y se copia del colaborador'
);

-- No cambia si después se modifica el % del colaborador.
update public.colaboradores set porcentaje_comision = 0.55 where codigo = 901;

select is(
  (select porcentaje_comision from public.ordenes_lavado where turno = 61),
  0.30::numeric(5, 4),
  'el porcentaje_comision de la orden sigue siendo el original aunque cambie el del colaborador'
);

-- Se recalcula si se cambia colaborador_id mientras la orden está abierta.
update public.ordenes_lavado set colaborador_id = (select id from public.colaboradores where codigo = 910) where turno = 61;

select is(
  (select porcentaje_comision from public.ordenes_lavado where turno = 61),
  (select porcentaje_comision from public.colaboradores where codigo = 910),
  'el porcentaje_comision se recalcula al cambiar el colaborador de una orden abierta'
);

select * from finish();
rollback;
