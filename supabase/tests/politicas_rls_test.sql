-- Políticas RLS por rol (Bloque 11, SCRUM-147). Suplanta un rol de
-- negocio con: set local role authenticated; select set_config(
-- 'request.jwt.claims', '{"app_metadata":{"rol":"..."}}', true).
--
-- "Permitido"/"denegado" se prueban así: SELECT denegado = 0 filas
-- visibles (RLS filtra en silencio, no es un error); INSERT/UPDATE
-- denegado por WITH CHECK = error (violates row-level security policy);
-- intento de anon o de una columna sin GRANT = error 42501
-- (permission denied), porque ahí ni siquiera hay privilegio de Postgres.
--
-- pendiente y anon no tienen NINGUNA operación permitida en ninguna
-- tabla (es la invariante que se prueba) — por eso solo se cubre su caso
-- "denegado" en las 11 tablas, nunca un "permitido" que no existe.
begin;
create extension if not exists pgtap with schema extensions;
select plan(78);

-- ============================================================
-- rol_actual()
-- ============================================================

set local role authenticated;

select is(public.rol_actual(), null, 'rol_actual() sin claim devuelve null');

select set_config('request.jwt.claims', '{"app_metadata":{"rol":"administrador"}}', true);
select is(public.rol_actual(), 'administrador', 'rol_actual() con claim devuelve el rol correcto');

reset role;

select is(has_function_privilege('anon', 'public.rol_actual()', 'execute'),
  false, 'anon NO puede ejecutar rol_actual()');
select is(has_function_privilege('authenticated', 'public.rol_actual()', 'execute'),
  true, 'authenticated SÍ puede ejecutar rol_actual()');
select is(has_function_privilege('service_role', 'public.rol_actual()', 'execute'),
  true, 'service_role SÍ puede ejecutar rol_actual()');

-- ============================================================
-- anon: cero acceso en las 11 tablas (ni siquiera GRANT de tabla)
-- ============================================================

set local role anon;

select throws_ok($$select 1 from public.usuarios limit 1$$, '42501', null, 'anon no puede leer usuarios');
select throws_ok($$select 1 from public.colaboradores limit 1$$, '42501', null, 'anon no puede leer colaboradores');
select throws_ok($$select 1 from public.servicios limit 1$$, '42501', null, 'anon no puede leer servicios');
select throws_ok($$select 1 from public.tarifas_servicio limit 1$$, '42501', null, 'anon no puede leer tarifas_servicio');
select throws_ok($$select 1 from public.clientes limit 1$$, '42501', null, 'anon no puede leer clientes');
select throws_ok($$select 1 from public.vehiculos limit 1$$, '42501', null, 'anon no puede leer vehiculos');
select throws_ok($$select 1 from public.jornadas limit 1$$, '42501', null, 'anon no puede leer jornadas');
select throws_ok($$select 1 from public.reaperturas_jornada limit 1$$, '42501', null, 'anon no puede leer reaperturas_jornada');
select throws_ok($$select 1 from public.ordenes_lavado limit 1$$, '42501', null, 'anon no puede leer ordenes_lavado');
select throws_ok($$select 1 from public.parametros_negocio limit 1$$, '42501', null, 'anon no puede leer parametros_negocio');
select throws_ok($$select 1 from public.auditoria limit 1$$, '42501', null, 'anon no puede leer auditoria');

reset role;

-- ============================================================
-- pendiente: cero acceso en las 11 tablas (tiene el GRANT de
-- authenticated, pero ninguna política lo incluye: 0 filas visibles)
-- ============================================================

set local role authenticated;
select set_config('request.jwt.claims', '{"app_metadata":{"rol":"pendiente"}}', true);

select is_empty($$select id from public.usuarios$$, 'pendiente no ve ninguna fila de usuarios');
select is_empty($$select id from public.colaboradores$$, 'pendiente no ve ninguna fila de colaboradores');
select is_empty($$select id from public.servicios$$, 'pendiente no ve ninguna fila de servicios');
select is_empty($$select id from public.tarifas_servicio$$, 'pendiente no ve ninguna fila de tarifas_servicio');
select is_empty($$select id from public.clientes$$, 'pendiente no ve ninguna fila de clientes');
select is_empty($$select id from public.vehiculos$$, 'pendiente no ve ninguna fila de vehiculos');
select is_empty($$select id from public.jornadas$$, 'pendiente no ve ninguna fila de jornadas');
select is_empty($$select id from public.reaperturas_jornada$$, 'pendiente no ve ninguna fila de reaperturas_jornada');
select is_empty($$select id from public.ordenes_lavado$$, 'pendiente no ve ninguna fila de ordenes_lavado');
select is_empty($$select id from public.parametros_negocio$$, 'pendiente no ve ninguna fila de parametros_negocio');
select is_empty($$select id from public.auditoria$$, 'pendiente no ve ninguna fila de auditoria');

select throws_ok(
  $$insert into public.clientes (nombre, documento, tipo, telefono) values ('Prueba Pendiente', '900000001', 'particular', '3000000001')$$,
  null, null, 'pendiente no puede insertar en clientes'
);

reset role;

-- ============================================================
-- Tabla representativa completa: clientes (select/insert/update/delete
-- x soporte/administrador/superadmin)
-- ============================================================

set local role service_role;
insert into public.clientes (nombre, documento, tipo, telefono) values
  ('Cliente RLS Soporte', '900000010', 'particular', '3000000010'),
  ('Cliente RLS Borrar', '900000011', 'particular', '3000000011');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"app_metadata":{"rol":"soporte"}}', true);

select isnt_empty($$select id from public.clientes where documento = '900000010'$$, 'soporte SÍ puede consultar clientes');
select throws_ok(
  $$insert into public.clientes (nombre, documento, tipo, telefono) values ('Cliente RLS Rechazado', '900000012', 'particular', '3000000012')$$,
  null, null, 'soporte NO puede crear un cliente'
);
-- UPDATE/DELETE denegado por la cláusula USING no lanza excepción: la
-- fila simplemente no entra al conjunto afectado (0 filas), por eso se
-- comprueba que no hubo efecto, en vez de esperar una excepción.
select lives_ok(
  $$update public.clientes set nombre = 'Cambiado' where documento = '900000010'$$,
  'el intento de soporte de editar un cliente no lanza excepción (0 filas afectadas)'
);
select results_eq(
  $$select nombre from public.clientes where documento = '900000010'$$,
  $$values ('Cliente RLS Soporte'::varchar)$$,
  'soporte NO puede editar un cliente: el nombre sigue igual'
);
select lives_ok(
  $$delete from public.clientes where documento = '900000011'$$,
  'el intento de soporte de eliminar un cliente no lanza excepción (0 filas afectadas)'
);
select isnt_empty(
  $$select id from public.clientes where documento = '900000011'$$,
  'soporte NO puede eliminar un cliente: la fila sigue existiendo'
);

select set_config('request.jwt.claims', '{"app_metadata":{"rol":"administrador"}}', true);

select lives_ok(
  $$update public.clientes set nombre = 'Cliente RLS Editado' where documento = '900000010'$$,
  'administrador SÍ puede editar un cliente'
);
select results_eq(
  $$select nombre from public.clientes where documento = '900000010'$$,
  $$values ('Cliente RLS Editado'::varchar)$$,
  'el cliente quedó editado por administrador'
);

select set_config('request.jwt.claims', '{"app_metadata":{"rol":"superadmin"}}', true);

select lives_ok(
  $$delete from public.clientes where documento = '900000011'$$,
  'superadmin SÍ puede eliminar un cliente'
);
select is_empty($$select id from public.clientes where documento = '900000011'$$, 'el cliente quedó eliminado');

reset role;

-- ============================================================
-- Resto de tablas "estándar" (colaboradores, servicios,
-- tarifas_servicio, vehiculos): mismo patrón que clientes, un par de
-- puntos representativos por tabla (no se repite la matriz completa).
-- ============================================================

set local role authenticated;
select set_config('request.jwt.claims', '{"app_metadata":{"rol":"soporte"}}', true);

select isnt_empty($$select id from public.colaboradores$$, 'soporte SÍ puede consultar colaboradores');
select throws_ok(
  $$insert into public.colaboradores (codigo, nombre, documento, telefono, porcentaje_comision, tipo_vinculacion) values (777, 'Rechazado', '900000777', '3000000777', 0.37, 'fijo')$$,
  null, null, 'soporte NO puede crear un colaborador'
);

select isnt_empty($$select id from public.servicios$$, 'soporte SÍ puede consultar servicios');
select throws_ok(
  $$insert into public.servicios (numero, nombre) values (32000, 'Rechazado')$$,
  null, null, 'soporte NO puede crear un servicio'
);

select isnt_empty($$select id from public.tarifas_servicio$$, 'soporte SÍ puede consultar tarifas_servicio');
select throws_ok(
  $$insert into public.tarifas_servicio (servicio_id, tipo_vehiculo, valor) values ((select id from public.servicios limit 1), 'platon_7_pasajeros', 15000)$$,
  null, null, 'soporte NO puede crear una tarifa_servicio'
);

select isnt_empty($$select id from public.vehiculos$$, 'soporte SÍ puede consultar vehiculos');
select throws_ok(
  $$insert into public.vehiculos (placa, tipo_vehiculo, cliente_id) values ('RLS001', 'automovil', (select id from public.clientes limit 1))$$,
  null, null, 'soporte NO puede crear un vehiculo'
);

reset role;

set local role service_role;
insert into public.colaboradores (codigo, nombre, documento, telefono, porcentaje_comision, tipo_vinculacion) values
  (778, 'Colaborador RLS Administrador', '900000778', '3000000778', 0.37, 'fijo');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"app_metadata":{"rol":"administrador"}}', true);

select lives_ok(
  $$delete from public.colaboradores where codigo = 778$$,
  'administrador SÍ puede eliminar un colaborador'
);

reset role;

-- ============================================================
-- usuarios: columnas (sin password_hash), UPDATE solo de rol y solo
-- para superadmin
-- ============================================================

set local role authenticated;
select set_config('request.jwt.claims', '{"app_metadata":{"rol":"soporte"}}', true);

select isnt_empty($$select id, nombre, email, rol from public.usuarios$$, 'soporte SÍ puede consultar usuarios (sin password_hash)');
select throws_ok(
  $$select password_hash from public.usuarios limit 1$$,
  '42501', null, 'soporte NO puede leer password_hash (columna sin GRANT)'
);

select set_config('request.jwt.claims', '{"app_metadata":{"rol":"superadmin"}}', true);
select throws_ok(
  $$select password_hash from public.usuarios limit 1$$,
  '42501', null, 'ni superadmin puede leer password_hash: la columna no tiene GRANT para nadie de authenticated'
);
select throws_ok(
  $$update public.usuarios set nombre = 'Cambiado' where id = (select id from public.usuarios limit 1)$$,
  '42501', null, 'ni superadmin puede editar la columna nombre: solo rol tiene GRANT de UPDATE'
);

set local role service_role;
insert into public.usuarios (nombre, email, password_hash, rol) values
  ('Usuario RLS Prueba', 'usuariorls@carwash.test', '$2b$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0', 'pendiente');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"app_metadata":{"rol":"administrador"}}', true);
select lives_ok(
  $$update public.usuarios set rol = 'soporte' where email = 'usuariorls@carwash.test'$$,
  'el intento de administrador de asignar un rol no lanza excepción (0 filas afectadas)'
);
select results_eq(
  $$select rol from public.usuarios where email = 'usuariorls@carwash.test'$$,
  $$values ('pendiente'::text)$$,
  'administrador NO puede asignar un rol: sigue en pendiente'
);

select set_config('request.jwt.claims', '{"app_metadata":{"rol":"superadmin"}}', true);
select lives_ok(
  $$update public.usuarios set rol = 'soporte' where email = 'usuariorls@carwash.test'$$,
  'superadmin SÍ puede asignar un rol'
);
select results_eq(
  $$select rol from public.usuarios where email = 'usuariorls@carwash.test'$$,
  $$values ('soporte'::text)$$,
  'el rol quedó asignado por superadmin'
);

reset role;

-- ============================================================
-- jornadas: abrir/cerrar para los tres roles; reabrir (UPDATE a
-- 'abierta') solo superadmin
-- ============================================================

set local role service_role;
update public.jornadas set estado = 'cerrada', cerrada_en = now() where estado = 'abierta';
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"app_metadata":{"rol":"soporte"}}', true);

select lives_ok(
  $$insert into public.jornadas (fecha) values ('2020-02-02')$$,
  'soporte SÍ puede abrir (insertar) una jornada'
);
select lives_ok(
  $$update public.jornadas set estado = 'cerrada', cerrada_en = now() where fecha = '2020-02-02'$$,
  'soporte SÍ puede cerrar una jornada'
);
select throws_ok(
  $$update public.jornadas set estado = 'abierta' where fecha = '2020-02-02'$$,
  null, null, 'soporte NO puede reabrir una jornada'
);

select set_config('request.jwt.claims', '{"app_metadata":{"rol":"superadmin"}}', true);
select lives_ok(
  $$update public.jornadas set estado = 'abierta' where fecha = '2020-02-02'$$,
  'superadmin SÍ puede reabrir una jornada'
);

reset role;

-- ============================================================
-- reaperturas_jornada: visible para los tres roles; insertar (el
-- efecto de reabrir) solo superadmin
-- ============================================================

-- La actualización directa de jornadas.estado en la sección anterior no
-- crea por sí sola una fila de reaperturas_jornada (eso lo hace
-- explícitamente jornadas.service.js, en JS, no un trigger); por eso la
-- fila "permitido" de superadmin se prueba primero, para tener un dato
-- real que soporte pueda consultar después.
set local role authenticated;
select set_config('request.jwt.claims', '{"app_metadata":{"rol":"superadmin"}}', true);
select lives_ok(
  $$insert into public.reaperturas_jornada (jornada_id) values ((select id from public.jornadas where fecha = '2020-02-02'))$$,
  'superadmin SÍ puede insertar una reapertura directamente'
);

select set_config('request.jwt.claims', '{"app_metadata":{"rol":"soporte"}}', true);
select isnt_empty($$select id from public.reaperturas_jornada$$, 'soporte SÍ puede consultar reaperturas_jornada');
select throws_ok(
  $$insert into public.reaperturas_jornada (jornada_id) values ((select id from public.jornadas where fecha = '2020-02-02'))$$,
  null, null, 'soporte NO puede insertar una reapertura directamente'
);

reset role;

-- ============================================================
-- ordenes_lavado: editar/avanzar para los tres roles; anular (UPDATE a
-- 'cancelada') solo superadmin/administrador
-- ============================================================

set local role service_role;
select id into temporary table t_orden_no_terminal from public.ordenes_lavado
  where estado not in ('entregada', 'cancelada') limit 1;
grant select on t_orden_no_terminal to authenticated;
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"app_metadata":{"rol":"soporte"}}', true);

select lives_ok(
  $$update public.ordenes_lavado set observaciones = 'Editado por soporte (RLS)' where id = (select id from t_orden_no_terminal)$$,
  'soporte SÍ puede editar una orden (sin tocar su estado a cancelada)'
);
select throws_ok(
  $$update public.ordenes_lavado set estado = 'cancelada', motivo = 'rechazado' where id = (select id from t_orden_no_terminal)$$,
  null, null, 'soporte NO puede anular (cancelar) una orden'
);

select set_config('request.jwt.claims', '{"app_metadata":{"rol":"administrador"}}', true);
select lives_ok(
  $$update public.ordenes_lavado set estado = 'cancelada', motivo = 'anulada en prueba RLS' where id = (select id from t_orden_no_terminal)$$,
  'administrador SÍ puede anular (cancelar) una orden'
);

reset role;

-- ============================================================
-- parametros_negocio: consultar para los tres roles; actualizar solo
-- superadmin
-- ============================================================

set local role authenticated;
select set_config('request.jwt.claims', '{"app_metadata":{"rol":"soporte"}}', true);

select isnt_empty($$select id from public.parametros_negocio$$, 'soporte SÍ puede consultar parametros_negocio');
select lives_ok(
  $$update public.parametros_negocio set nombre_negocio = 'Rechazado' where id = 1$$,
  'el intento de soporte de actualizar parametros_negocio no lanza excepción (0 filas afectadas)'
);
select results_eq(
  $$select nombre_negocio from public.parametros_negocio where id = 1$$,
  $$select nombre_negocio from public.parametros_negocio where id = 1 and nombre_negocio <> 'Rechazado'$$,
  'soporte NO puede actualizar parametros_negocio: el nombre sigue igual'
);

select set_config('request.jwt.claims', '{"app_metadata":{"rol":"superadmin"}}', true);
select lives_ok(
  $$update public.parametros_negocio set nombre_negocio = 'Car Wash RLS' where id = 1$$,
  'superadmin SÍ puede actualizar parametros_negocio'
);

reset role;

-- ============================================================
-- auditoria: solo lectura, solo superadmin; sin UPDATE/DELETE para nadie
-- ============================================================

set local role authenticated;
select set_config('request.jwt.claims', '{"app_metadata":{"rol":"superadmin"}}', true);

select isnt_empty($$select id from public.auditoria$$, 'superadmin SÍ puede consultar auditoria');
select throws_ok(
  $$update public.auditoria set accion = 'editar' where id = (select id from public.auditoria limit 1)$$,
  '42501', null, 'ni superadmin puede editar auditoria (sin GRANT de UPDATE para nadie)'
);
select throws_ok(
  $$delete from public.auditoria where id = (select id from public.auditoria limit 1)$$,
  '42501', null, 'ni superadmin puede borrar auditoria (sin GRANT de DELETE para nadie)'
);

select set_config('request.jwt.claims', '{"app_metadata":{"rol":"administrador"}}', true);
select is_empty($$select id from public.auditoria$$, 'administrador NO puede consultar auditoria');

select set_config('request.jwt.claims', '{"app_metadata":{"rol":"soporte"}}', true);
select is_empty($$select id from public.auditoria$$, 'soporte NO puede consultar auditoria');

reset role;

-- ============================================================
-- service_role: sigue pudiendo todo (las pruebas de la API no se rompen)
-- ============================================================

set local role service_role;

select isnt_empty($$select id from public.usuarios$$, 'service_role SÍ puede consultar usuarios');
select lives_ok($$select password_hash from public.usuarios limit 1$$, 'service_role SÍ puede leer password_hash');
select lives_ok(
  $$update public.usuarios set nombre = 'Cambiado por service_role' where email = 'usuariorls@carwash.test'$$,
  'service_role SÍ puede editar cualquier columna de usuarios'
);
select lives_ok($$select id from public.auditoria limit 1$$, 'service_role SÍ puede consultar auditoria');

reset role;

select * from finish();
rollback;
