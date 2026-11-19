begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

-- ============================================================
-- Fixtures
-- ============================================================

insert into public.usuarios (nombre, email, password_hash, rol) values
  ('Usuario Auditoria', 'auditoria@carwash.test', '$2b$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0', 'administrador'),
  ('Usuario Jsonb Prueba', 'jsonbprueba@carwash.test', '$2b$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0', 'soporte');

-- Atribuye las siguientes escrituras al usuario de auditoría vía
-- app.usuario_id (una de las dos fuentes que lee registrar_auditoria()).
select set_config('app.usuario_id', (select id::text from public.usuarios where email = 'auditoria@carwash.test'), true);

-- ============================================================
-- INSERT, UPDATE y DELETE en una tabla de negocio generan
-- crear, editar y eliminar
-- ============================================================

insert into public.colaboradores (codigo, nombre, documento, telefono, porcentaje_comision, tipo_vinculacion) values
  (950, 'Colaborador Auditoria', '2000000950', '3000000950', 0.37, 'fijo');

create temporary table t_colaborador_auditoria as
  select id from public.colaboradores where codigo = 950;

select is(
  (select accion from public.auditoria
     where tabla = 'colaboradores' and registro_id = (select id from t_colaborador_auditoria)
     order by id desc limit 1),
  'crear',
  'un INSERT en una tabla de negocio genera accion=crear en auditoria'
);

update public.colaboradores set telefono = '3000000951' where codigo = 950;

select is(
  (select accion from public.auditoria
     where tabla = 'colaboradores' and registro_id = (select id from t_colaborador_auditoria)
     order by id desc limit 1),
  'editar',
  'un UPDATE en una tabla de negocio genera accion=editar en auditoria'
);

delete from public.colaboradores where codigo = 950;

select is(
  (select accion from public.auditoria
     where tabla = 'colaboradores' and registro_id = (select id from t_colaborador_auditoria)
     order by id desc limit 1),
  'eliminar',
  'un DELETE en una tabla de negocio genera accion=eliminar en auditoria'
);

-- ============================================================
-- Cancelar una orden genera accion=anular
-- ============================================================

-- El seed deja una jornada abierta: se cierra dentro de esta misma
-- transacción (se revierte con el rollback final) para poder abrir la
-- jornada propia de esta prueba.
update public.jornadas set estado = 'cerrada', cerrada_en = now() where estado = 'abierta';

insert into public.jornadas (fecha, abierta_por) values
  (current_date, (select id from public.usuarios where email = 'auditoria@carwash.test'));

insert into public.clientes (nombre, documento, tipo, telefono) values
  ('Cliente Auditoria', '1000000950', 'particular', '3000000952');

insert into public.vehiculos (placa, tipo_vehiculo, cliente_id) values
  ('ZZC100', 'automovil', (select id from public.clientes where documento = '1000000950'));

insert into public.colaboradores (codigo, nombre, documento, telefono, porcentaje_comision, tipo_vinculacion) values
  (951, 'Colaborador Auditoria Orden', '2000000951', '3000000953', 0.37, 'fijo');

insert into public.servicios (numero, nombre) values (950, 'Servicio Auditoria');
insert into public.tarifas_servicio (servicio_id, tipo_vehiculo, valor) values
  ((select id from public.servicios where numero = 950), 'automovil', 22000);

insert into public.ordenes_lavado (jornada_id, fecha, turno, vehiculo_id, servicio_id, colaborador_id, medio_pago, valor) values
  ((select id from public.jornadas where fecha = current_date), current_date, 1,
   (select id from public.vehiculos where placa = 'ZZC100'),
   (select id from public.servicios where numero = 950),
   (select id from public.colaboradores where codigo = 951),
   'efectivo', 22000);

create temporary table t_orden_auditoria as
  select id from public.ordenes_lavado where turno = 1 and fecha = current_date;

update public.ordenes_lavado
  set estado = 'cancelada', motivo = 'Prueba de auditoría'
  where id = (select id from t_orden_auditoria);

select is(
  (select accion from public.auditoria
     where tabla = 'ordenes_lavado' and registro_id = (select id from t_orden_auditoria)
     order by id desc limit 1),
  'anular',
  'cancelar una orden genera accion=anular en auditoria'
);

-- ============================================================
-- usuario_id también se toma del header simulado x-usuario-id
-- (PostgREST en producción), no solo de app.usuario_id
-- ============================================================

-- Se limpia app.usuario_id para probar que el header, por sí solo, basta.
select set_config('app.usuario_id', '', true);
select set_config(
  'request.headers',
  '{"x-usuario-id":"' || (select id from public.usuarios where email = 'auditoria@carwash.test') || '"}',
  true
);

update public.colaboradores set telefono = '3000000960' where codigo = 951;

select is(
  (select usuario_id from public.auditoria
     where tabla = 'colaboradores' and registro_id = (select id from public.colaboradores where codigo = 951)
     order by id desc limit 1),
  (select id from public.usuarios where email = 'auditoria@carwash.test'),
  'usuario_id se toma del header simulado x-usuario-id cuando no hay app.usuario_id'
);

-- Se restaura app.usuario_id para el resto de la prueba.
select set_config('app.usuario_id', (select id::text from public.usuarios where email = 'auditoria@carwash.test'), true);
select set_config('request.headers', '', true);

-- ============================================================
-- El jsonb de usuarios nunca contiene password_hash
-- ============================================================

select ok(
  not (
    (select valor_nuevo from public.auditoria
       where tabla = 'usuarios' and registro_id = (select id from public.usuarios where email = 'jsonbprueba@carwash.test')
       order by id desc limit 1)
    ? 'password_hash'
  ),
  'el jsonb de auditoria para usuarios nunca contiene password_hash'
);

-- ============================================================
-- Cambiar solo una columna técnica no agrega filas a la auditoría
-- ============================================================

create temporary table t_conteo_auditoria_antes as select count(*) as n from public.auditoria;

update public.usuarios set intentos_fallidos = 3 where email = 'jsonbprueba@carwash.test';

select is(
  (select count(*) from public.auditoria)::int,
  (select n from t_conteo_auditoria_antes)::int,
  'cambiar solo intentos_fallidos no agrega filas a la auditoria'
);

-- ============================================================
-- auditoria es inmutable: UPDATE (23514), DELETE (23001) y
-- TRUNCATE (23001), incluso como postgres
-- ============================================================

select throws_ok(
  $$update public.auditoria set accion = 'editar' where id = (select min(id) from public.auditoria)$$,
  '23514',
  null,
  'UPDATE sobre auditoria falla con 23514, incluso como postgres'
);

select throws_ok(
  $$delete from public.auditoria where id = (select min(id) from public.auditoria)$$,
  '23001',
  null,
  'DELETE sobre auditoria falla con 23001, incluso como postgres'
);

select throws_ok(
  $$truncate public.auditoria$$,
  '23001',
  null,
  'TRUNCATE sobre auditoria falla con 23001, incluso como postgres'
);

-- ============================================================
-- service_role no puede insertar en auditoria (42501)
-- ============================================================

set local role service_role;

select throws_ok(
  $$insert into public.auditoria (tabla, registro_id, accion, valor_nuevo)
    values ('colaboradores', 1, 'crear', '{}'::jsonb)$$,
  '42501',
  null,
  'service_role no puede insertar en auditoria'
);

reset role;

select * from finish();
rollback;
