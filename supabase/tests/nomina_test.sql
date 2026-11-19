begin;
create extension if not exists pgtap with schema extensions;
select plan(59);

-- ============================================================
-- Fixtures. Quincena A de prueba: 2026-01-01 a 2026-01-15 (ya pasada
-- respecto a cualquier "hoy" real de esta suite; p_hoy siempre se pasa
-- explícito en liquidar_quincena, nunca depende de now()/current_date).
-- ============================================================

insert into public.usuarios (nombre, email, password_hash, rol) values
  ('Usuario Nomina', 'nomina3@carwash.test', '$2b$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0', 'administrador');

-- 402, 409 y 410 ya existen en el seed (María Gómez, Andrés Ramírez,
-- Camila Vargas — las identidades reales de la planilla): se reusan por
-- codigo, solo se ajusta el % de 402/409 para que la orden valga
-- exactamente la comisión del caso real. Sus órdenes de seed son de
-- 2026-08-03/04, fuera del rango de esta quincena (2026-01-01..31), así
-- que no interfieren con ningún cálculo de comisión de este archivo.
update public.colaboradores set porcentaje_comision = 1.00 where codigo in (402, 409);

insert into public.colaboradores (codigo, nombre, documento, telefono, porcentaje_comision, tipo_vinculacion) values
  (960, 'Colaborador Nomina Activo', '2000000960', '3000000960', 0.30, 'fijo'),
  (961, 'Colaborador Nomina Inactivo', '2000000961', '3000000961', 0.30, 'fijo'),
  (970, 'Colaborador Tope', '2000000970', '3000000970', 0.50, 'fijo'),
  (964, 'Colaborador Regla Prestamos', '2000000964', '3000000964', 0.50, 'fijo'),
  (966, 'Colaborador Reasignar Origen', '2000000966', '3000000966', 0.50, 'fijo'),
  (967, 'Colaborador Reasignar Destino', '2000000967', '3000000967', 0.50, 'fijo'),
  (420, 'Colaborador Jabon Protege Nada A', '2000000420', '3000000420', 0.10, 'fijo'),
  (421, 'Colaborador Jabon Protege Nada B', '2000000421', '3000000421', 0.10, 'fijo');
update public.colaboradores set estado = 'inactivo', inactivo_desde = now() where codigo = 961;

insert into public.clientes (nombre, documento, tipo, telefono) values
  ('Cliente Nomina', '1000000960', 'particular', '3000000962');
insert into public.vehiculos (placa, tipo_vehiculo, cliente_id) values
  ('ZZE200', 'automovil', (select id from public.clientes where documento = '1000000960')),
  ('ZZE201', 'automovil', (select id from public.clientes where documento = '1000000960')),
  ('ZZE202', 'automovil', (select id from public.clientes where documento = '1000000960')),
  ('ZZE203', 'automovil', (select id from public.clientes where documento = '1000000960')),
  ('ZZE204', 'automovil', (select id from public.clientes where documento = '1000000960')),
  ('ZZE205', 'automovil', (select id from public.clientes where documento = '1000000960'));

insert into public.servicios (numero, nombre) values (960, 'Lavado Nomina');
insert into public.tarifas_servicio (servicio_id, tipo_vehiculo, valor) values
  ((select id from public.servicios where numero = 960), 'automovil', 20000);

update public.jornadas set estado = 'cerrada', cerrada_en = now() where estado = 'abierta';
insert into public.jornadas (fecha, abierta_por) values
  ('2026-01-05', (select id from public.usuarios where email = 'nomina3@carwash.test'));
insert into public.jornadas (fecha, abierta_por, estado, cerrada_en, cerrada_por) values
  ('2026-04-05', (select id from public.usuarios where email = 'nomina3@carwash.test'), 'cerrada', now(),
   (select id from public.usuarios where email = 'nomina3@carwash.test'));

-- ============================================================
-- Caso planilla real (hoja T1): colaborador 402, comisión 811.040,
-- préstamo 120.000, jabón 153.500, multa 10.000 -> neto 527.540,
-- saldo_pendiente 0. Colaborador 409: comisión 50.000, préstamo 30.000,
-- jabón 40.000 (70.000 > comisión) -> neto 0, saldo_pendiente 20.000.
-- Porcentaje 1.00 para que la orden valga exactamente la comisión.
-- ============================================================

insert into public.ordenes_lavado (jornada_id, fecha, turno, vehiculo_id, servicio_id, colaborador_id, medio_pago, valor, estado) values
  ((select id from public.jornadas where fecha = '2026-01-05'), '2026-01-05', 100,
   (select id from public.vehiculos where placa = 'ZZE200'),
   (select id from public.servicios where numero = 960),
   (select id from public.colaboradores where codigo = 402),
   'efectivo', 811040, 'entregada'),
  ((select id from public.jornadas where fecha = '2026-01-05'), '2026-01-05', 101,
   (select id from public.vehiculos where placa = 'ZZE200'),
   (select id from public.servicios where numero = 960),
   (select id from public.colaboradores where codigo = 409),
   'efectivo', 50000, 'entregada');

select public.registrar_descuento((select id from public.colaboradores where codigo = 402), 'prestamo', 120000, '2026-01-07',
  (select id from public.usuarios where email = 'nomina3@carwash.test'));
select public.registrar_descuento((select id from public.colaboradores where codigo = 402), 'jabon', 153500, '2026-01-08',
  (select id from public.usuarios where email = 'nomina3@carwash.test'), 'Jabón quincena');
select public.registrar_descuento((select id from public.colaboradores where codigo = 402), 'multa', 10000, '2026-01-09',
  (select id from public.usuarios where email = 'nomina3@carwash.test'), 'Multa por tardanza');

select public.registrar_descuento((select id from public.colaboradores where codigo = 409), 'prestamo', 30000, '2026-01-07',
  (select id from public.usuarios where email = 'nomina3@carwash.test'));
select public.registrar_descuento((select id from public.colaboradores where codigo = 409), 'jabon', 40000, '2026-01-08',
  (select id from public.usuarios where email = 'nomina3@carwash.test'));

-- ============================================================
-- Colaborador 960: dos órdenes a distinto % congelado + una cancelada
-- (no debe contar). Base para los casos de registrar_descuento.
-- ============================================================

insert into public.ordenes_lavado (jornada_id, fecha, turno, vehiculo_id, servicio_id, colaborador_id, medio_pago, valor, estado) values
  ((select id from public.jornadas where fecha = '2026-01-05'), '2026-01-05', 102,
   (select id from public.vehiculos where placa = 'ZZE200'),
   (select id from public.servicios where numero = 960),
   (select id from public.colaboradores where codigo = 960),
   'efectivo', 20000, 'entregada');

update public.colaboradores set porcentaje_comision = 0.40 where codigo = 960;
insert into public.ordenes_lavado (jornada_id, fecha, turno, vehiculo_id, servicio_id, colaborador_id, medio_pago, valor, estado) values
  ((select id from public.jornadas where fecha = '2026-01-05'), '2026-01-05', 103,
   (select id from public.vehiculos where placa = 'ZZE200'),
   (select id from public.servicios where numero = 960),
   (select id from public.colaboradores where codigo = 960),
   'efectivo', 20000, 'entregada');

insert into public.ordenes_lavado (jornada_id, fecha, turno, vehiculo_id, servicio_id, colaborador_id, medio_pago, valor, estado, motivo) values
  ((select id from public.jornadas where fecha = '2026-01-05'), '2026-01-05', 104,
   (select id from public.vehiculos where placa = 'ZZE200'),
   (select id from public.servicios where numero = 960),
   (select id from public.colaboradores where codigo = 960),
   'efectivo', 999999, 'cancelada', 'Prueba de fixture');

select is(
  public.comision_colaborador_periodo((select id from public.colaboradores where codigo = 960), '2026-01-01', '2026-01-15'),
  14000,
  'comisión acumulada usa el % congelado de cada orden (6000 + 8000 = 14000), ignora la cancelada'
);

-- ============================================================
-- registrar_descuento: tipo inválido
-- ============================================================

select throws_ok(
  format(
    'select public.registrar_descuento(%s, ''cafe'', 1000, ''2026-01-07'', %s)',
    (select id from public.colaboradores where codigo = 960),
    (select id from public.usuarios where email = 'nomina3@carwash.test')
  ),
  null, null,
  'registrar un descuento de tipo inválido falla'
);

-- ============================================================
-- Jabón sin límite + el límite de préstamo considera TODOS los
-- descuentos ya registrados (no solo préstamos previos).
-- ============================================================

select lives_ok(
  format(
    'select public.registrar_descuento(%s, ''jabon'', 4000, ''2026-01-07'', %s)',
    (select id from public.colaboradores where codigo = 960),
    (select id from public.usuarios where email = 'nomina3@carwash.test')
  ),
  'registrar un jabón no lanza excepción (sin límite de comisión)'
);

select lives_ok(
  format(
    'select public.registrar_descuento(%s, ''prestamo'', 10000, ''2026-01-08'', %s)',
    (select id from public.colaboradores where codigo = 960),
    (select id from public.usuarios where email = 'nomina3@carwash.test')
  ),
  'un préstamo que cabe en el disponible tras restar el jabón ya registrado (14000-4000=10000) no lanza excepción'
);

select throws_ok(
  format(
    'select public.registrar_descuento(%s, ''prestamo'', 1, ''2026-01-09'', %s)',
    (select id from public.colaboradores where codigo = 960),
    (select id from public.usuarios where email = 'nomina3@carwash.test')
  ),
  null, null,
  'un préstamo cuando ya no queda disponible (jabón + préstamo ya usaron toda la comisión) falla, aunque sea de 1 peso'
);

select lives_ok(
  format(
    'select public.registrar_descuento(%s, ''multa'', 1000, ''2026-01-09'', %s)',
    (select id from public.colaboradores where codigo = 960),
    (select id from public.usuarios where email = 'nomina3@carwash.test')
  ),
  'registrar una multa no lanza excepción aunque el disponible ya sea cero (sin límite de comisión)'
);

-- ============================================================
-- Préstamo acotado por tope_prestamo_colaborador
-- ============================================================

insert into public.ordenes_lavado (jornada_id, fecha, turno, vehiculo_id, servicio_id, colaborador_id, medio_pago, valor, estado) values
  ((select id from public.jornadas where fecha = '2026-01-05'), '2026-01-05', 106,
   (select id from public.vehiculos where placa = 'ZZE200'),
   (select id from public.servicios where numero = 960),
   (select id from public.colaboradores where codigo = 970),
   'efectivo', 20000, 'entregada');

update public.parametros_negocio set tope_prestamo_colaborador = 2000 where id = 1;

select throws_ok(
  format(
    'select public.registrar_descuento(%s, ''prestamo'', 3000, ''2026-01-07'', %s)',
    (select id from public.colaboradores where codigo = 970),
    (select id from public.usuarios where email = 'nomina3@carwash.test')
  ),
  null, null,
  'un préstamo dentro de la comisión disponible (10000) pero sobre el tope configurado (2000) falla'
);

update public.parametros_negocio set tope_prestamo_colaborador = 0 where id = 1;

-- ============================================================
-- Colaborador inactivo
-- ============================================================

select throws_ok(
  format(
    'select public.registrar_descuento(%s, ''prestamo'', 100, ''2026-01-07'', %s)',
    (select id from public.colaboradores where codigo = 961),
    (select id from public.usuarios where email = 'nomina3@carwash.test')
  ),
  null, null,
  'registrar un descuento a un colaborador inactivo falla'
);

-- ============================================================
-- Liquidar: antes del fin del periodo, con órdenes abiertas
-- ============================================================

select throws_ok(
  format(
    'select public.liquidar_quincena(''2026-01-01'', ''2026-01-15'', %s, ''2026-01-10'')',
    (select id from public.usuarios where email = 'nomina3@carwash.test')
  ),
  null, null,
  'liquidar antes de que termine el periodo (hoy=10, fin=15) falla'
);

insert into public.ordenes_lavado (jornada_id, fecha, turno, vehiculo_id, servicio_id, colaborador_id, medio_pago, valor, estado) values
  ((select id from public.jornadas where fecha = '2026-01-05'), '2026-01-05', 105,
   (select id from public.vehiculos where placa = 'ZZE201'),
   (select id from public.servicios where numero = 960),
   (select id from public.colaboradores where codigo = 960),
   'efectivo', 15000, 'registrada');

select throws_ok(
  format(
    'select public.liquidar_quincena(''2026-01-01'', ''2026-01-15'', %s, ''2026-01-20'')',
    (select id from public.usuarios where email = 'nomina3@carwash.test')
  ),
  null, null,
  'liquidar con una orden abierta (registrada) en el periodo falla'
);

-- La BD no impone la máquina de estados (eso es de la API, R9): pasa
-- directo a 'terminada' (no 'entregada') para reproducir más abajo el
-- hallazgo de revisión (reasignar una orden 'terminada' tras liquidar).
update public.ordenes_lavado set estado = 'terminada' where turno = 105;

-- ============================================================
-- 964: préstamo que, al cancelar la única orden abierta, rompería la
-- cobertura (R13 solo protege préstamos).
-- ============================================================

insert into public.ordenes_lavado (jornada_id, fecha, turno, vehiculo_id, servicio_id, colaborador_id, medio_pago, valor, estado) values
  ((select id from public.jornadas where fecha = '2026-01-05'), '2026-01-05', 107,
   (select id from public.vehiculos where placa = 'ZZE202'),
   (select id from public.servicios where numero = 960),
   (select id from public.colaboradores where codigo = 964),
   'efectivo', 20000, 'registrada');
select public.registrar_descuento((select id from public.colaboradores where codigo = 964), 'prestamo', 10000, '2026-01-07',
  (select id from public.usuarios where email = 'nomina3@carwash.test'));

select throws_ok(
  $$update public.ordenes_lavado set estado = 'cancelada', motivo = 'intento' where turno = 107$$,
  null, null,
  'cancelar la única orden abierta de un colaborador con un préstamo registrado por el total de su comisión falla'
);

update public.ordenes_lavado set estado = 'entregada' where turno = 107;

-- ============================================================
-- 966/967: préstamo que, al reasignar una de dos órdenes, NO rompe la
-- cobertura (queda comisión suficiente en la orden restante).
-- ============================================================

insert into public.ordenes_lavado (jornada_id, fecha, turno, vehiculo_id, servicio_id, colaborador_id, medio_pago, valor, estado) values
  ((select id from public.jornadas where fecha = '2026-01-05'), '2026-01-05', 108,
   (select id from public.vehiculos where placa = 'ZZE203'),
   (select id from public.servicios where numero = 960),
   (select id from public.colaboradores where codigo = 966),
   'efectivo', 20000, 'entregada'),
  ((select id from public.jornadas where fecha = '2026-01-05'), '2026-01-05', 109,
   (select id from public.vehiculos where placa = 'ZZE203'),
   (select id from public.servicios where numero = 960),
   (select id from public.colaboradores where codigo = 966),
   'efectivo', 20000, 'registrada');
select public.registrar_descuento((select id from public.colaboradores where codigo = 966), 'prestamo', 5000, '2026-01-07',
  (select id from public.usuarios where email = 'nomina3@carwash.test'));

select lives_ok(
  format(
    'update public.ordenes_lavado set colaborador_id = %s where turno = 109',
    (select id from public.colaboradores where codigo = 967)
  ),
  'reasignar una de dos órdenes abiertas que NO rompe la cobertura del préstamo del colaborador anterior no lanza excepción'
);

update public.ordenes_lavado set estado = 'entregada' where turno = 109;

-- ============================================================
-- Liquidar feliz: todas las órdenes del periodo ya están cerradas.
-- ============================================================

select lives_ok(
  format(
    'select public.liquidar_quincena(''2026-01-01'', ''2026-01-15'', %s, ''2026-01-20'')',
    (select id from public.usuarios where email = 'nomina3@carwash.test')
  ),
  'liquidar una quincena ya terminada, sin órdenes abiertas, no lanza excepción'
);

-- ============================================================
-- Caso planilla real: comprobación exacta de los números esperados.
-- ============================================================

select is(
  (select comision from public.liquidacion_colaboradores
     where liquidacion_id = (select id from public.liquidaciones_nomina where periodo_inicio = '2026-01-01' and periodo_fin = '2026-01-15')
       and colaborador_id = (select id from public.colaboradores where codigo = 402)),
  811040, 'colaborador 402: comisión = 811.040 (igual que la planilla real)'
);
select is(
  (select descuentos from public.liquidacion_colaboradores
     where liquidacion_id = (select id from public.liquidaciones_nomina where periodo_inicio = '2026-01-01' and periodo_fin = '2026-01-15')
       and colaborador_id = (select id from public.colaboradores where codigo = 402)),
  283500, 'colaborador 402: descuentos = 283.500 (120.000 + 153.500 + 10.000)'
);
select is(
  (select neto from public.liquidacion_colaboradores
     where liquidacion_id = (select id from public.liquidaciones_nomina where periodo_inicio = '2026-01-01' and periodo_fin = '2026-01-15')
       and colaborador_id = (select id from public.colaboradores where codigo = 402)),
  527540, 'colaborador 402: neto = 527.540 (igual que la planilla real)'
);
select is(
  (select saldo_pendiente from public.liquidacion_colaboradores
     where liquidacion_id = (select id from public.liquidaciones_nomina where periodo_inicio = '2026-01-01' and periodo_fin = '2026-01-15')
       and colaborador_id = (select id from public.colaboradores where codigo = 402)),
  0, 'colaborador 402: saldo_pendiente = 0 (la comisión cubre todos los descuentos)'
);

select is(
  (select comision from public.liquidacion_colaboradores
     where liquidacion_id = (select id from public.liquidaciones_nomina where periodo_inicio = '2026-01-01' and periodo_fin = '2026-01-15')
       and colaborador_id = (select id from public.colaboradores where codigo = 409)),
  50000, 'colaborador 409: comisión = 50.000'
);
select is(
  (select descuentos from public.liquidacion_colaboradores
     where liquidacion_id = (select id from public.liquidaciones_nomina where periodo_inicio = '2026-01-01' and periodo_fin = '2026-01-15')
       and colaborador_id = (select id from public.colaboradores where codigo = 409)),
  70000, 'colaborador 409: descuentos = 70.000 (30.000 + 40.000, superan la comisión)'
);
select is(
  (select neto from public.liquidacion_colaboradores
     where liquidacion_id = (select id from public.liquidaciones_nomina where periodo_inicio = '2026-01-01' and periodo_fin = '2026-01-15')
       and colaborador_id = (select id from public.colaboradores where codigo = 409)),
  0, 'colaborador 409: neto = 0 (los descuentos superan la comisión)'
);
select is(
  (select saldo_pendiente from public.liquidacion_colaboradores
     where liquidacion_id = (select id from public.liquidaciones_nomina where periodo_inicio = '2026-01-01' and periodo_fin = '2026-01-15')
       and colaborador_id = (select id from public.colaboradores where codigo = 409)),
  20000, 'colaborador 409: saldo_pendiente = 20.000 (70.000 - 50.000)'
);
select is(
  (select neto from public.liquidacion_colaboradores
     where liquidacion_id = (select id from public.liquidaciones_nomina where periodo_inicio = '2026-01-01' and periodo_fin = '2026-01-15')
       and colaborador_id = (select id from public.colaboradores where codigo = 409)),
  (select comision - descuentos + saldo_pendiente from public.liquidacion_colaboradores
     where liquidacion_id = (select id from public.liquidaciones_nomina where periodo_inicio = '2026-01-01' and periodo_fin = '2026-01-15')
       and colaborador_id = (select id from public.colaboradores where codigo = 409)),
  'colaborador 409: invariante neto = comisión - descuentos + saldo_pendiente'
);

-- El encabezado es la suma de los detalles por colaborador (y no un
-- número fijo: la quincena A tiene varios colaboradores a la vez).
select is(
  (select total_comision from public.liquidaciones_nomina where periodo_inicio = '2026-01-01' and periodo_fin = '2026-01-15'),
  (select coalesce(sum(comision), 0)::integer from public.liquidacion_colaboradores
     where liquidacion_id = (select id from public.liquidaciones_nomina where periodo_inicio = '2026-01-01' and periodo_fin = '2026-01-15')),
  'total_comision del encabezado es la suma de las comisiones del detalle'
);
select is(
  (select total_descuentos from public.liquidaciones_nomina where periodo_inicio = '2026-01-01' and periodo_fin = '2026-01-15'),
  (select coalesce(sum(descuentos), 0)::integer from public.liquidacion_colaboradores
     where liquidacion_id = (select id from public.liquidaciones_nomina where periodo_inicio = '2026-01-01' and periodo_fin = '2026-01-15')),
  'total_descuentos del encabezado es la suma de los descuentos del detalle'
);
select is(
  (select total_neto from public.liquidaciones_nomina where periodo_inicio = '2026-01-01' and periodo_fin = '2026-01-15'),
  (select coalesce(sum(neto), 0)::integer from public.liquidacion_colaboradores
     where liquidacion_id = (select id from public.liquidaciones_nomina where periodo_inicio = '2026-01-01' and periodo_fin = '2026-01-15')),
  'total_neto del encabezado es la suma de los netos del detalle'
);

-- El cxc automático por el saldo_pendiente de 409 cae en la quincena
-- SIGUIENTE (fecha = periodo_fin + 1 = 2026-01-16), sin liquidacion_id.
select is(
  (select valor from public.descuentos_colaborador
     where colaborador_id = (select id from public.colaboradores where codigo = 409)
       and tipo = 'cxc' and fecha = '2026-01-16'),
  20000, 'liquidar_quincena crea automáticamente un descuento cxc de 20.000 para 409, fechado al día siguiente del periodo'
);
select is(
  (select liquidacion_id from public.descuentos_colaborador
     where colaborador_id = (select id from public.colaboradores where codigo = 409)
       and tipo = 'cxc' and fecha = '2026-01-16'),
  null, 'el cxc recién creado para la quincena siguiente aún no tiene liquidacion_id'
);

select isnt_empty(
  $$select id from public.ordenes_lavado where liquidacion_id is not null and turno in (100, 101, 102, 103, 104, 105, 106, 107, 108, 109)$$,
  'las órdenes del periodo (incluida la cancelada y la terminada) quedaron marcadas con la liquidación'
);
select isnt_empty(
  $$select id from public.descuentos_colaborador where liquidacion_id is not null$$,
  'los descuentos del periodo quedaron marcados con la liquidación'
);

-- Doble liquidación del mismo periodo falla (UNIQUE periodo_inicio/periodo_fin).
select throws_ok(
  format(
    'select public.liquidar_quincena(''2026-01-01'', ''2026-01-15'', %s, ''2026-01-20'')',
    (select id from public.usuarios where email = 'nomina3@carwash.test')
  ),
  '23505', null,
  'liquidar dos veces el mismo periodo falla por el UNIQUE de periodo'
);

-- ============================================================
-- R12b (hallazgo de revisión): reasignar el colaborador de una orden
-- cuya quincena YA fue liquidada falla, sin importar su estado (turno
-- 105 quedó 'terminada', no 'entregada', antes de liquidar).
-- ============================================================

select throws_ok(
  format(
    'update public.ordenes_lavado set colaborador_id = %s where turno = 105',
    (select id from public.colaboradores where codigo = 961)
  ),
  null, null,
  'reasignar una orden ''terminada'' cuya quincena ya fue liquidada falla'
);

-- R12 (preservado): cancelar una orden ya liquidada también falla.
select throws_ok(
  $$update public.ordenes_lavado set estado = 'cancelada', motivo = 'intento' where turno = 100$$,
  null, null,
  'cancelar una orden de un periodo ya liquidado falla'
);

-- ============================================================
-- Insertar una orden en una quincena ya liquidada falla (preservado).
-- ============================================================

select throws_ok(
  format(
    $sql$insert into public.ordenes_lavado
      (jornada_id, fecha, turno, vehiculo_id, servicio_id, colaborador_id, medio_pago, valor, estado)
      values (%s, '2026-01-05', 199, %s, %s, %s, 'efectivo', 1000, 'registrada')$sql$,
    (select id from public.jornadas where fecha = '2026-01-05'),
    (select id from public.vehiculos where placa = 'ZZE200'),
    (select id from public.servicios where numero = 960),
    (select id from public.colaboradores where codigo = 960)
  ),
  null, null,
  'insertar una orden con fecha en una quincena ya liquidada falla'
);

-- ============================================================
-- R13/R14 SOLO protegen préstamos: un jabón que por sí solo superaría
-- la comisión de la orden NO bloquea ni cancelar ni reasignar (quincena
-- de abril, nunca liquidada en esta suite).
-- ============================================================

insert into public.ordenes_lavado (jornada_id, fecha, turno, vehiculo_id, servicio_id, colaborador_id, medio_pago, valor, estado) values
  ((select id from public.jornadas where fecha = '2026-04-05'), '2026-04-05', 200,
   (select id from public.vehiculos where placa = 'ZZE204'),
   (select id from public.servicios where numero = 960),
   (select id from public.colaboradores where codigo = 420),
   'efectivo', 20000, 'registrada'),
  ((select id from public.jornadas where fecha = '2026-04-05'), '2026-04-05', 201,
   (select id from public.vehiculos where placa = 'ZZE205'),
   (select id from public.servicios where numero = 960),
   (select id from public.colaboradores where codigo = 421),
   'efectivo', 20000, 'registrada');
select public.registrar_descuento((select id from public.colaboradores where codigo = 420), 'jabon', 50000, '2026-04-07',
  (select id from public.usuarios where email = 'nomina3@carwash.test'));
select public.registrar_descuento((select id from public.colaboradores where codigo = 421), 'jabon', 50000, '2026-04-07',
  (select id from public.usuarios where email = 'nomina3@carwash.test'));

select lives_ok(
  $$update public.ordenes_lavado set estado = 'cancelada', motivo = 'intento' where turno = 200$$,
  'cancelar la única orden abierta de un colaborador con un jabón muy superior a su comisión NO lanza excepción (R13 solo protege préstamos)'
);
select lives_ok(
  format(
    'update public.ordenes_lavado set colaborador_id = %s where turno = 201',
    (select id from public.colaboradores where codigo = 967)
  ),
  'reasignar la única orden abierta de un colaborador con un jabón muy superior a su comisión NO lanza excepción (R14 solo protege préstamos)'
);

-- ============================================================
-- Quincena B (2026-01-16 a 2026-01-31): el cxc de 409 entra aquí, y un
-- colaborador con jabón pero SIN órdenes también debe aparecer.
-- ============================================================

select public.registrar_descuento((select id from public.colaboradores where codigo = 410), 'jabon', 5000, '2026-01-20',
  (select id from public.usuarios where email = 'nomina3@carwash.test'));

select lives_ok(
  format(
    'select public.liquidar_quincena(''2026-01-16'', ''2026-01-31'', %s, ''2026-02-05'')',
    (select id from public.usuarios where email = 'nomina3@carwash.test')
  ),
  'liquidar la quincena siguiente (con el cxc arrastrado y un colaborador solo con jabón) no lanza excepción'
);

select is(
  (select descuentos from public.liquidacion_colaboradores
     where liquidacion_id = (select id from public.liquidaciones_nomina where periodo_inicio = '2026-01-16' and periodo_fin = '2026-01-31')
       and colaborador_id = (select id from public.colaboradores where codigo = 409)),
  20000, 'el cxc de 409 entró como descuento de la quincena siguiente'
);
select is(
  (select saldo_pendiente from public.liquidacion_colaboradores
     where liquidacion_id = (select id from public.liquidaciones_nomina where periodo_inicio = '2026-01-16' and periodo_fin = '2026-01-31')
       and colaborador_id = (select id from public.colaboradores where codigo = 409)),
  20000, '409 sigue sin comisión en esta quincena: el cxc completo queda como saldo_pendiente (se arrastra otra vez)'
);
select is(
  (select servicios from public.liquidacion_colaboradores
     where liquidacion_id = (select id from public.liquidaciones_nomina where periodo_inicio = '2026-01-16' and periodo_fin = '2026-01-31')
       and colaborador_id = (select id from public.colaboradores where codigo = 410)),
  0, 'colaborador 410 (solo jabón, sin órdenes) aparece en la liquidación con servicios = 0'
);
select is(
  (select descuentos from public.liquidacion_colaboradores
     where liquidacion_id = (select id from public.liquidaciones_nomina where periodo_inicio = '2026-01-16' and periodo_fin = '2026-01-31')
       and colaborador_id = (select id from public.colaboradores where codigo = 410)),
  5000, 'colaborador 410 (solo jabón, sin órdenes) aparece con sus descuentos correctos'
);
select is(
  (select saldo_pendiente from public.liquidacion_colaboradores
     where liquidacion_id = (select id from public.liquidaciones_nomina where periodo_inicio = '2026-01-16' and periodo_fin = '2026-01-31')
       and colaborador_id = (select id from public.colaboradores where codigo = 410)),
  5000, 'colaborador 410 (solo jabón, sin órdenes) queda con saldo_pendiente = su jabón (sin comisión que lo cubra)'
);

-- El saldo_pendiente de 409 en la quincena B (todavía sin comisión) se
-- vuelve a arrastrar como un NUEVO cxc a la quincena C (2026-02-01):
-- la cascada no se detiene hasta que la comisión alcance a cubrirla.
select is(
  (select valor from public.descuentos_colaborador
     where colaborador_id = (select id from public.colaboradores where codigo = 409)
       and tipo = 'cxc' and fecha = '2026-02-01'),
  20000, 'el saldo_pendiente de 409 se vuelve a arrastrar como cxc a la quincena C (la cascada sigue hasta cubrirse)'
);

-- ============================================================
-- No se puede liquidar una quincena anterior a una ya liquidada.
-- ============================================================

select lives_ok(
  format(
    'select public.liquidar_quincena(''2026-06-01'', ''2026-06-15'', %s, ''2026-06-20'')',
    (select id from public.usuarios where email = 'nomina3@carwash.test')
  ),
  'liquidar una quincena vacía y posterior (junio) no lanza excepción'
);
select throws_ok(
  format(
    'select public.liquidar_quincena(''2026-05-01'', ''2026-05-15'', %s, ''2026-05-20'')',
    (select id from public.usuarios where email = 'nomina3@carwash.test')
  ),
  null, null,
  'liquidar una quincena anterior (mayo) a una ya liquidada (junio) falla'
);

-- ============================================================
-- p_hoy: el default usa America/Bogota, nunca UTC/current_date.
-- ============================================================

select is(
  pg_get_function_arguments('public.liquidar_quincena(date, date, bigint, date)'::regprocedure) ~ 'America/Bogota',
  true,
  'el default de p_hoy en liquidar_quincena usa America/Bogota, no current_date'
);
select is(
  (timestamptz '2026-01-16 00:30:00+00' at time zone 'America/Bogota')::date,
  '2026-01-15'::date,
  'a las 19:30 hora Bogotá del día 15 (00:30 UTC del 16), la fecha de negocio sigue siendo el 15, no el 16 (la misma conversión que usa el default de liquidar_quincena)'
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
  has_function_privilege('service_role', 'public.registrar_descuento(bigint, text, integer, date, bigint, varchar)', 'execute'),
  true, 'service_role SÍ puede ejecutar registrar_descuento()'
);
select is(
  has_function_privilege('authenticated', 'public.registrar_descuento(bigint, text, integer, date, bigint, varchar)', 'execute'),
  false, 'authenticated NO puede ejecutar registrar_descuento()'
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
select isnt_empty($$select id from public.descuentos_colaborador$$, 'soporte SÍ puede consultar descuentos_colaborador');
select isnt_empty($$select id from public.liquidacion_colaboradores$$, 'soporte SÍ puede consultar liquidacion_colaboradores');

select set_config('request.jwt.claims', '{"app_metadata":{"rol":"pendiente"}}', true);
select is_empty($$select id from public.liquidaciones_nomina$$, 'pendiente NO puede consultar liquidaciones_nomina');
select is_empty($$select id from public.descuentos_colaborador$$, 'pendiente NO puede consultar descuentos_colaborador');
select is_empty($$select id from public.liquidacion_colaboradores$$, 'pendiente NO puede consultar liquidacion_colaboradores');
reset role;

select * from finish();
rollback;
