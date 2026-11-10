begin;
create extension if not exists pgtap with schema extensions;
select plan(39);

-- ============================================================
-- Fixtures. Quincena de prueba: 2026-01-01 a 2026-01-15 (ya pasada
-- respecto a cualquier "hoy" real de esta suite, y se parametriza p_hoy
-- en liquidar_quincena para no depender de now() en ningún caso).
-- ============================================================

insert into public.usuarios (nombre, email, password_hash, rol) values
  ('Usuario Nomina', 'nomina2@carwash.test', '$2b$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0', 'administrador');

insert into public.colaboradores (codigo, nombre, documento, telefono, porcentaje_comision, tipo_vinculacion) values
  (960, 'Colaborador Nomina Activo', '2000000960', '3000000960', 0.30, 'fijo'),
  (961, 'Colaborador Nomina Inactivo', '2000000961', '3000000961', 0.30, 'fijo');
update public.colaboradores set estado = 'inactivo', inactivo_desde = now() where codigo = 961;

insert into public.clientes (nombre, documento, tipo, telefono) values
  ('Cliente Nomina', '1000000960', 'particular', '3000000962');
insert into public.vehiculos (placa, tipo_vehiculo, cliente_id) values
  ('ZZE200', 'automovil', (select id from public.clientes where documento = '1000000960'));

insert into public.servicios (numero, nombre) values (960, 'Lavado Nomina');
insert into public.tarifas_servicio (servicio_id, tipo_vehiculo, valor) values
  ((select id from public.servicios where numero = 960), 'automovil', 20000);

update public.jornadas set estado = 'cerrada', cerrada_en = now() where estado = 'abierta';
insert into public.jornadas (fecha, abierta_por) values
  ('2026-01-05', (select id from public.usuarios where email = 'nomina2@carwash.test'));

-- Orden 1: colaborador 960 al 30% (porcentaje actual en ese momento).
insert into public.ordenes_lavado (jornada_id, fecha, turno, vehiculo_id, servicio_id, colaborador_id, medio_pago, valor, estado) values
  ((select id from public.jornadas where fecha = '2026-01-05'), '2026-01-05', 960,
   (select id from public.vehiculos where placa = 'ZZE200'),
   (select id from public.servicios where numero = 960),
   (select id from public.colaboradores where codigo = 960),
   'efectivo', 20000, 'entregada');

-- Sube el % del colaborador a 40% ANTES de la segunda orden: cada orden
-- congela el % vigente al crearla (preparar_orden_lavado), así que esta
-- prueba cubre "comisión con órdenes de distintos %" para el MISMO
-- colaborador (20000*0.30=6000 + 20000*0.40=8000 = 14000, nunca 2*0.30 ni 2*0.40).
update public.colaboradores set porcentaje_comision = 0.40 where codigo = 960;
insert into public.ordenes_lavado (jornada_id, fecha, turno, vehiculo_id, servicio_id, colaborador_id, medio_pago, valor, estado) values
  ((select id from public.jornadas where fecha = '2026-01-05'), '2026-01-05', 961,
   (select id from public.vehiculos where placa = 'ZZE200'),
   (select id from public.servicios where numero = 960),
   (select id from public.colaboradores where codigo = 960),
   'efectivo', 20000, 'entregada');

-- Orden cancelada, mismo colaborador y quincena, valor grande: no debe
-- contar para nada.
insert into public.ordenes_lavado (jornada_id, fecha, turno, vehiculo_id, servicio_id, colaborador_id, medio_pago, valor, estado, motivo) values
  ((select id from public.jornadas where fecha = '2026-01-05'), '2026-01-05', 962,
   (select id from public.vehiculos where placa = 'ZZE200'),
   (select id from public.servicios where numero = 960),
   (select id from public.colaboradores where codigo = 960),
   'efectivo', 999999, 'cancelada', 'Prueba de fixture');

-- ============================================================
-- comisión: distintos % congelados + cancelada no cuenta
-- ============================================================

select is(
  public.comision_colaborador_periodo((select id from public.colaboradores where codigo = 960), '2026-01-01', '2026-01-15'),
  14000,
  'comisión acumulada usa el % congelado de cada orden (6000 + 8000 = 14000), ignora la cancelada'
);

-- ============================================================
-- Préstamos: dentro y fuera del límite por comisión
-- ============================================================

select lives_ok(
  format(
    'select public.registrar_prestamo(%s, 10000, ''2026-01-07'', %s)',
    (select id from public.colaboradores where codigo = 960),
    (select id from public.usuarios where email = 'nomina2@carwash.test')
  ),
  'un préstamo dentro del disponible (10000 de 14000) no lanza excepción'
);

select throws_ok(
  format(
    'select public.registrar_prestamo(%s, 5000, ''2026-01-08'', %s)',
    (select id from public.colaboradores where codigo = 960),
    (select id from public.usuarios where email = 'nomina2@carwash.test')
  ),
  null, null,
  'un segundo préstamo que exceda lo ya disponible (quedan 4000 de 14000, pide 5000) falla'
);

select lives_ok(
  format(
    'select public.registrar_prestamo(%s, 4000, ''2026-01-08'', %s)',
    (select id from public.colaboradores where codigo = 960),
    (select id from public.usuarios where email = 'nomina2@carwash.test')
  ),
  'un segundo préstamo que SÍ cabe en lo que queda disponible (4000 de 4000) no lanza excepción'
);

select is(
  (select coalesce(sum(valor), 0)::int from public.prestamos_colaborador
     where colaborador_id = (select id from public.colaboradores where codigo = 960)),
  14000,
  'los préstamos de la misma quincena se acumulan (10000 + 4000 = 14000, justo el disponible)'
);

select throws_ok(
  format(
    'select public.registrar_prestamo(%s, 1, ''2026-01-09'', %s)',
    (select id from public.colaboradores where codigo = 960),
    (select id from public.usuarios where email = 'nomina2@carwash.test')
  ),
  null, null,
  'un tercer préstamo cuando ya no queda nada disponible (0 de 14000) falla, aunque sea de 1 peso'
);

-- ============================================================
-- Préstamo acotado por tope_prestamo_colaborador
-- ============================================================

update public.parametros_negocio set tope_prestamo_colaborador = 2000 where id = 1;

select throws_ok(
  format(
    'select public.registrar_prestamo(%s, 3000, ''2026-01-10'', %s)',
    (select id from public.colaboradores where codigo = 961),
    (select id from public.usuarios where email = 'nomina2@carwash.test')
  ),
  null, null,
  'un préstamo dentro de la comisión disponible pero sobre el tope configurado (2000) falla'
);

update public.parametros_negocio set tope_prestamo_colaborador = 0 where id = 1;

-- ============================================================
-- Colaborador inactivo
-- ============================================================

select throws_ok(
  format(
    'select public.registrar_prestamo(%s, 100, ''2026-01-10'', %s)',
    (select id from public.colaboradores where codigo = 961),
    (select id from public.usuarios where email = 'nomina2@carwash.test')
  ),
  null, null,
  'registrar un préstamo a un colaborador inactivo falla'
);

-- ============================================================
-- Liquidar: antes del fin del periodo, con órdenes abiertas
-- ============================================================

select throws_ok(
  format(
    'select public.liquidar_quincena(''2026-01-01'', ''2026-01-15'', %s, ''2026-01-10'')',
    (select id from public.usuarios where email = 'nomina2@carwash.test')
  ),
  null, null,
  'liquidar antes de que termine el periodo (hoy=10, fin=15) falla'
);

insert into public.ordenes_lavado (jornada_id, fecha, turno, vehiculo_id, servicio_id, colaborador_id, medio_pago, valor, estado) values
  ((select id from public.jornadas where fecha = '2026-01-05'), '2026-01-05', 963,
   (select id from public.vehiculos where placa = 'ZZE200'),
   (select id from public.servicios where numero = 960),
   (select id from public.colaboradores where codigo = 960),
   'efectivo', 15000, 'registrada');

select throws_ok(
  format(
    'select public.liquidar_quincena(''2026-01-01'', ''2026-01-15'', %s, ''2026-01-20'')',
    (select id from public.usuarios where email = 'nomina2@carwash.test')
  ),
  null, null,
  'liquidar con una orden abierta (registrada) en el periodo falla'
);

update public.ordenes_lavado set estado = 'entregada' where turno = 963;

-- ============================================================
-- Liquidar feliz: totales correctos y detalle congelado
-- ============================================================

select lives_ok(
  format(
    'select public.liquidar_quincena(''2026-01-01'', ''2026-01-15'', %s, ''2026-01-20'')',
    (select id from public.usuarios where email = 'nomina2@carwash.test')
  ),
  'liquidar una quincena ya terminada, sin órdenes abiertas, no lanza excepción'
);

-- comisión total: 14000 (de antes) + 15000*0.40=6000 (orden 963, al % ya
-- subido a 0.40) = 20000. préstamos: 14000. neto: 6000.
select is(
  (select total_comision from public.liquidaciones_nomina where periodo_inicio = '2026-01-01' and periodo_fin = '2026-01-15'),
  20000, 'total_comision de la liquidación es la suma correcta (14000 + 6000)'
);
select is(
  (select total_prestamos from public.liquidaciones_nomina where periodo_inicio = '2026-01-01' and periodo_fin = '2026-01-15'),
  14000, 'total_prestamos de la liquidación es la suma de los préstamos de la quincena'
);
select is(
  (select total_neto from public.liquidaciones_nomina where periodo_inicio = '2026-01-01' and periodo_fin = '2026-01-15'),
  6000, 'total_neto = comisión − préstamos (20000 − 14000 = 6000)'
);
select is(
  (select comision from public.liquidacion_colaboradores
     where liquidacion_id = (select id from public.liquidaciones_nomina where periodo_inicio = '2026-01-01' and periodo_fin = '2026-01-15')
       and colaborador_id = (select id from public.colaboradores where codigo = 960)),
  20000, 'el detalle congelado del colaborador tiene su comisión correcta'
);
select isnt_empty(
  $$select id from public.ordenes_lavado where liquidacion_id is not null and turno in (960, 961, 962, 963)$$,
  'las órdenes del periodo (incluida la cancelada) quedaron marcadas con la liquidación'
);
select isnt_empty(
  $$select id from public.prestamos_colaborador where liquidacion_id is not null$$,
  'los préstamos del periodo quedaron marcados con la liquidación'
);

-- Doble liquidación del mismo periodo falla (UNIQUE periodo_inicio/periodo_fin).
select throws_ok(
  format(
    'select public.liquidar_quincena(''2026-01-01'', ''2026-01-15'', %s, ''2026-01-20'')',
    (select id from public.usuarios where email = 'nomina2@carwash.test')
  ),
  '23505', null,
  'liquidar dos veces el mismo periodo falla por el UNIQUE de periodo'
);

-- ============================================================
-- Cancelar tras liquidar falla; cancelar que rompe préstamos falla
-- ============================================================

select throws_ok(
  $$update public.ordenes_lavado set estado = 'cancelada', motivo = 'intento' where turno = 960$$,
  null, null,
  'cancelar una orden de un periodo ya liquidado falla'
);

-- Colaborador aparte, en una quincena DISTINTA y sin liquidar (la de
-- enero ya se liquidó arriba, y registrar_prestamo ya no lo permitiría),
-- al límite exacto de su comisión con préstamos: cancelar su única
-- orden abierta rompe la regla (dejaría comisión < préstamos pendientes).
-- Se inserta ya 'cerrada' (el estado de la jornada no importa para esta
-- prueba, y el índice único global solo permite UNA jornada 'abierta' a
-- la vez en todo el sistema — la de enero sigue abierta en este punto).
insert into public.jornadas (fecha, abierta_por, estado, cerrada_en, cerrada_por) values
  ('2026-02-05', (select id from public.usuarios where email = 'nomina2@carwash.test'), 'cerrada', now(),
   (select id from public.usuarios where email = 'nomina2@carwash.test'));
insert into public.colaboradores (codigo, nombre, documento, telefono, porcentaje_comision, tipo_vinculacion) values
  (964, 'Colaborador Regla Prestamos', '2000000964', '3000000964', 0.50, 'fijo');
insert into public.ordenes_lavado (jornada_id, fecha, turno, vehiculo_id, servicio_id, colaborador_id, medio_pago, valor, estado) values
  ((select id from public.jornadas where fecha = '2026-02-05'), '2026-02-05', 965,
   (select id from public.vehiculos where placa = 'ZZE200'),
   (select id from public.servicios where numero = 960),
   (select id from public.colaboradores where codigo = 964),
   'efectivo', 20000, 'registrada');
-- comisión disponible: 20000*0.50=10000
select public.registrar_prestamo((select id from public.colaboradores where codigo = 964), 10000, '2026-02-07',
  (select id from public.usuarios where email = 'nomina2@carwash.test'));

select throws_ok(
  $$update public.ordenes_lavado set estado = 'cancelada', motivo = 'intento' where turno = 965$$,
  null, null,
  'cancelar la única orden abierta de un colaborador con préstamos ya registrados por el total de su comisión falla'
);

-- ============================================================
-- Insertar una orden en una quincena ya liquidada falla (R14 del ajuste:
-- una jornada reabierta no puede producir órdenes sin liquidar).
-- ============================================================

select throws_ok(
  format(
    $sql$insert into public.ordenes_lavado
      (jornada_id, fecha, turno, vehiculo_id, servicio_id, colaborador_id, medio_pago, valor, estado)
      values (%s, '2026-01-05', 970, %s, %s, %s, 'efectivo', 1000, 'registrada')$sql$,
    (select id from public.jornadas where fecha = '2026-01-05'),
    (select id from public.vehiculos where placa = 'ZZE200'),
    (select id from public.servicios where numero = 960),
    (select id from public.colaboradores where codigo = 960)
  ),
  null, null,
  'insertar una orden con fecha en una quincena ya liquidada falla'
);

-- ============================================================
-- Reasignar colaborador en una orden abierta: rompe los préstamos del
-- colaborador anterior (falla) vs. no los rompe (funciona).
-- ============================================================

-- turno 965 es la única orden de 964, que ya tiene un préstamo por el
-- total de su comisión: reasignarla lo deja en 0, igual que cancelarla.
select throws_ok(
  format(
    'update public.ordenes_lavado set colaborador_id = %s where turno = 965',
    (select id from public.colaboradores where codigo = 960)
  ),
  null, null,
  'reasignar la única orden abierta de un colaborador con préstamos ya registrados por el total de su comisión falla'
);

insert into public.vehiculos (placa, tipo_vehiculo, cliente_id) values
  ('ZZE201', 'automovil', (select id from public.clientes where documento = '1000000960'));
insert into public.colaboradores (codigo, nombre, documento, telefono, porcentaje_comision, tipo_vinculacion) values
  (966, 'Colaborador Reasignar', '2000000966', '3000000966', 0.50, 'fijo');
insert into public.ordenes_lavado (jornada_id, fecha, turno, vehiculo_id, servicio_id, colaborador_id, medio_pago, valor, estado) values
  ((select id from public.jornadas where fecha = '2026-02-05'), '2026-02-05', 971,
   (select id from public.vehiculos where placa = 'ZZE201'),
   (select id from public.servicios where numero = 960),
   (select id from public.colaboradores where codigo = 966),
   'efectivo', 20000, 'entregada'),
  ((select id from public.jornadas where fecha = '2026-02-05'), '2026-02-05', 972,
   (select id from public.vehiculos where placa = 'ZZE201'),
   (select id from public.servicios where numero = 960),
   (select id from public.colaboradores where codigo = 966),
   'efectivo', 20000, 'registrada');
-- comisión de 966: 20000*0.50 (turno 971) + 20000*0.50 (turno 972) = 20000. Préstamo 5000.
select public.registrar_prestamo((select id from public.colaboradores where codigo = 966), 5000, '2026-02-07',
  (select id from public.usuarios where email = 'nomina2@carwash.test'));

-- Reasignar turno 972 deja a 966 con 10000 (solo turno 971), todavía por
-- encima de su préstamo (5000): no rompe nada.
select lives_ok(
  format(
    'update public.ordenes_lavado set colaborador_id = %s where turno = 972',
    (select id from public.colaboradores where codigo = 960)
  ),
  'reasignar una orden abierta que NO rompe los préstamos del colaborador anterior no lanza excepción'
);

-- ============================================================
-- Liquidar con préstamos superiores a la comisión del periodo: falla y
-- no deja ninguna fila. Inalcanzable por las rutas normales (R13/R14 ya
-- lo impiden) — se fuerza con un INSERT directo en prestamos_colaborador,
-- sin pasar por registrar_prestamo(), para probar la última defensa
-- dentro de liquidar_quincena().
-- ============================================================

insert into public.jornadas (fecha, abierta_por, estado, cerrada_en, cerrada_por) values
  ('2026-03-05', (select id from public.usuarios where email = 'nomina2@carwash.test'), 'cerrada', now(),
   (select id from public.usuarios where email = 'nomina2@carwash.test'));
insert into public.colaboradores (codigo, nombre, documento, telefono, porcentaje_comision, tipo_vinculacion) values
  (967, 'Colaborador Liquidar Roto', '2000000967', '3000000967', 0.50, 'fijo');
insert into public.ordenes_lavado (jornada_id, fecha, turno, vehiculo_id, servicio_id, colaborador_id, medio_pago, valor, estado) values
  ((select id from public.jornadas where fecha = '2026-03-05'), '2026-03-05', 980,
   (select id from public.vehiculos where placa = 'ZZE200'),
   (select id from public.servicios where numero = 960),
   (select id from public.colaboradores where codigo = 967),
   'efectivo', 20000, 'entregada');
-- comisión real: 20000*0.50=10000. Préstamo forzado por encima (15000),
-- sin pasar por registrar_prestamo() (que lo habría rechazado).
insert into public.prestamos_colaborador (colaborador_id, fecha, valor, registrado_por) values
  ((select id from public.colaboradores where codigo = 967), '2026-03-07', 15000,
   (select id from public.usuarios where email = 'nomina2@carwash.test'));

select throws_ok(
  format(
    'select public.liquidar_quincena(''2026-03-01'', ''2026-03-15'', %s, ''2026-03-20'')',
    (select id from public.usuarios where email = 'nomina2@carwash.test')
  ),
  null, null,
  'liquidar un periodo donde un colaborador tiene préstamos por encima de su comisión falla'
);
select is_empty(
  $$select id from public.liquidaciones_nomina where periodo_inicio = '2026-03-01' and periodo_fin = '2026-03-15'$$,
  'liquidar con préstamos superiores a la comisión no deja ninguna liquidación'
);
select is_empty(
  $$select id from public.liquidacion_colaboradores where colaborador_id = (select id from public.colaboradores where codigo = 967)$$,
  'liquidar con préstamos superiores a la comisión no deja ningún detalle para ese colaborador'
);

-- ============================================================
-- Inmutabilidad (incluso para service_role) y privilegios de la RPC
-- ============================================================

set local role service_role;
select throws_ok(
  format('update public.liquidaciones_nomina set total_neto = 0 where periodo_inicio = ''2026-01-01'' and periodo_fin = ''2026-01-15''' ),
  '42501', null, 'ni service_role puede modificar una liquidación de nómina'
);
select throws_ok(
  'delete from public.liquidaciones_nomina where periodo_inicio = ''2026-01-01'' and periodo_fin = ''2026-01-15''',
  '42501', null, 'ni service_role puede eliminar una liquidación de nómina'
);
select throws_ok(
  'delete from public.liquidacion_colaboradores where colaborador_id = (select id from public.colaboradores where codigo = 960)',
  '42501', null, 'ni service_role puede eliminar el detalle de una liquidación'
);
reset role;

select is(
  has_function_privilege('service_role', 'public.registrar_prestamo(bigint, integer, date, bigint)', 'execute'),
  true, 'service_role SÍ puede ejecutar registrar_prestamo()'
);
select is(
  has_function_privilege('authenticated', 'public.registrar_prestamo(bigint, integer, date, bigint)', 'execute'),
  false, 'authenticated NO puede ejecutar registrar_prestamo()'
);
select is(
  has_function_privilege('service_role', 'public.liquidar_quincena(date, date, bigint, date)', 'execute'),
  true, 'service_role SÍ puede ejecutar liquidar_quincena()'
);
select is(
  has_function_privilege('anon', 'public.liquidar_quincena(date, date, bigint, date)', 'execute'),
  false, 'anon NO puede ejecutar liquidar_quincena()'
);

-- ============================================================
-- RLS por rol de las tres tablas nuevas
-- ============================================================

set local role authenticated;
select set_config('request.jwt.claims', '{"app_metadata":{"rol":"soporte"}}', true);
select isnt_empty($$select id from public.liquidaciones_nomina$$, 'soporte SÍ puede consultar liquidaciones_nomina');
select isnt_empty($$select id from public.prestamos_colaborador$$, 'soporte SÍ puede consultar prestamos_colaborador');
select isnt_empty($$select id from public.liquidacion_colaboradores$$, 'soporte SÍ puede consultar liquidacion_colaboradores');

select set_config('request.jwt.claims', '{"app_metadata":{"rol":"pendiente"}}', true);
select is_empty($$select id from public.liquidaciones_nomina$$, 'pendiente NO puede consultar liquidaciones_nomina');
select is_empty($$select id from public.prestamos_colaborador$$, 'pendiente NO puede consultar prestamos_colaborador');
select is_empty($$select id from public.liquidacion_colaboradores$$, 'pendiente NO puede consultar liquidacion_colaboradores');
reset role;

select * from finish();
rollback;
