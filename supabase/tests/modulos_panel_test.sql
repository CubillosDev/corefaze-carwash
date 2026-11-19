begin;
create extension if not exists pgtap with schema extensions;
select plan(39);

-- ============================================================
-- Caja, crédito con vales, inventario, tokens de jornada y reportes
-- (migraciones 20261119*). Fixtures en rangos que el seed no toca y en
-- una fecha lejana, para que los reportes solo vean estos datos.
-- ============================================================

insert into public.usuarios (nombre, email, password_hash, rol) values
  ('Usuario Modulos Panel', 'modulospanel@carwash.test', '$2b$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0', 'administrador');

create temporary table fx on commit drop as
  select (select id from public.usuarios where email = 'modulospanel@carwash.test') as usuario;

update public.cajas
  set estado = 'cerrada', cerrada_en = now(), cerrada_por = abierta_por, efectivo_esperado = 0, efectivo_contado = 0
  where estado = 'abierta';
update public.jornadas set estado = 'cerrada', cerrada_en = now() where estado = 'abierta';

select throws_ok(
  $$select public.abrir_caja(100000, (select usuario from fx))$$,
  '23514', 'Abre la jornada antes de abrir la caja',
  'Sin jornada abierta no se abre la caja'
);

insert into public.jornadas (fecha, abierta_por) values ('2031-03-05', (select usuario from fx));

insert into public.colaboradores (codigo, nombre, documento, telefono, porcentaje_comision, tipo_vinculacion) values
  (930, 'Colaborador Modulos', '2000000930', '3000000930', 0.40, 'fijo');

insert into public.clientes (nombre, documento, tipo, telefono, credito_habilitado) values
  ('Empresa Modulos', '900000930', 'empresa', '3000000931', true),
  ('Particular Modulos', '1000000930', 'particular', '3000000932', false);

insert into public.vehiculos (placa, tipo_vehiculo, cliente_id) values
  ('ZZM930', 'automovil', (select id from public.clientes where documento = '900000930')),
  ('ZZM931', 'automovil', (select id from public.clientes where documento = '1000000930')),
  ('ZZM932', 'automovil', (select id from public.clientes where documento = '1000000930'));

insert into public.servicios (numero, nombre) values (930, 'Lavado Modulos Panel');
insert into public.tarifas_servicio (servicio_id, tipo_vehiculo, valor) values
  ((select id from public.servicios where numero = 930), 'automovil', 20000);

insert into public.ordenes_lavado (jornada_id, fecha, turno, vehiculo_id, servicio_id, colaborador_id, medio_pago, valor, estado)
select j.id, j.fecha, t.turno, (select id from public.vehiculos where placa = t.placa),
       (select id from public.servicios where numero = 930), (select id from public.colaboradores where codigo = 930),
       'efectivo', 20000, t.estado
from public.jornadas j
cross join (values (930, 'ZZM930', 'terminada'), (931, 'ZZM931', 'terminada'), (932, 'ZZM932', 'en_proceso')) as t(turno, placa, estado)
where j.fecha = '2031-03-05';

create temporary table ord on commit drop as
  select turno, id from public.ordenes_lavado where fecha = '2031-03-05';

-- ---------------- Caja ----------------
select isnt(public.abrir_caja(100000, (select usuario from fx)), null, 'Abre la caja de la jornada abierta');

select throws_ok(
  $$select public.abrir_caja(50000, (select usuario from fx))$$,
  '23505', 'La caja de esta jornada ya se abrió',
  'Una sola caja por jornada'
);

select throws_ok(
  $$select public.registrar_cobro((select id from ord where turno = 932), 'efectivo', null, null, null, (select usuario from fx))$$,
  '23514', 'Solo se cobra una orden terminada',
  'Una orden en proceso no se cobra'
);

select throws_ok(
  $$select public.registrar_cobro((select id from ord where turno = 931), 'efectivo', 10000, null, null, (select usuario from fx))$$,
  '23514', 'El valor recibido no alcanza para el total',
  'El efectivo recibido debe cubrir el total'
);

select isnt(
  public.registrar_cobro((select id from ord where turno = 931), 'efectivo', 50000, null, null, (select usuario from fx)),
  null, 'Cobra en efectivo una orden terminada'
);

select results_eq(
  $$select estado, medio_pago, entregada_en is not null from public.ordenes_lavado where id = (select id from ord where turno = 931)$$,
  $$values ('entregada'::text, 'efectivo'::text, true)$$,
  'El cobro entrega la orden y marca la hora de entrega'
);

select results_eq(
  $$select valor, recibido, cambio from public.cobros_caja where orden_id = (select id from ord where turno = 931)$$,
  $$values (20000, 50000, 30000)$$,
  'El cobro guarda el valor de la orden, lo recibido y el cambio'
);

select throws_ok(
  $$select public.registrar_cobro((select id from ord where turno = 931), 'efectivo', null, null, null, (select usuario from fx))$$,
  '23514', 'Solo se cobra una orden terminada',
  'Una orden ya entregada no se cobra otra vez'
);

select throws_ok(
  $$select public.registrar_cobro((select id from ord where turno = 930), 'credito', null, (select id from public.clientes where documento = '900000930'), null, (select usuario from fx))$$,
  '23514', 'Un cobro a crédito exige la empresa y el número de vale',
  'A crédito exige el vale'
);

select throws_ok(
  $$select public.registrar_cobro((select id from ord where turno = 930), 'credito', null, (select id from public.clientes where documento = '1000000930'), 'ZZ-1', (select usuario from fx))$$,
  '23514', 'La empresa no está activa o no tiene crédito habilitado',
  'A crédito solo con una empresa con crédito (R8)'
);

select throws_ok(
  $$select public.registrar_cobro((select id from ord where turno = 930), 'nequi', null, null, 'ZZ-1', (select usuario from fx))$$,
  '23514', 'Solo un cobro a crédito lleva empresa y vale',
  'Un cobro que no es a crédito no lleva vale'
);

select isnt(
  public.registrar_cobro((select id from ord where turno = 930), 'credito', null,
    (select id from public.clientes where documento = '900000930'), ' zz-930 ', (select usuario from fx)),
  null, 'Carga a crédito una orden terminada con su vale'
);

select results_eq(
  $$select o.medio_pago, o.cliente_id = c.id, v.numero::text
    from public.ordenes_lavado o
    join public.vales_credito v on v.orden_id = o.id
    join public.clientes c on c.documento = '900000930'
    where o.id = (select id from ord where turno = 930)$$,
  $$values ('credito'::text, true, 'ZZ-930'::text)$$,
  'La orden queda a crédito de la empresa y el vale en mayúsculas'
);

select isnt(public.registrar_egreso_caja('insumos', 'Microfibras', 15000, (select usuario from fx)), null, 'Registra un egreso');

select throws_ok(
  $$update public.egresos_caja set valor = 1 where registrado_por = (select usuario from fx)$$,
  '23514', 'Un egreso de caja no se modifica',
  'Un egreso es inmutable'
);

select throws_ok(
  $$select public.registrar_egreso_caja('viajes', null, 1000, (select usuario from fx))$$,
  '23514', null,
  'La categoría del egreso es de la lista cerrada'
);

select isnt(public.cerrar_caja(100000, (select usuario from fx)), null, 'Cierra la caja con el arqueo');

select results_eq(
  $$select estado, efectivo_esperado, efectivo_contado, diferencia from public.cajas where jornada_id = (select id from public.jornadas where fecha = '2031-03-05')$$,
  $$values ('cerrada'::text, 105000, 100000, -5000)$$,
  'Esperado = base + efectivo cobrado − egresos; la diferencia es contado − esperado'
);

select throws_ok(
  $$select public.registrar_cobro((select id from ord where turno = 932), 'efectivo', null, null, null, (select usuario from fx))$$,
  '23514', 'Solo se cobra una orden terminada',
  'La orden en proceso sigue sin poder cobrarse'
);

update public.ordenes_lavado set estado = 'terminada' where id = (select id from ord where turno = 932);

select throws_ok(
  $$select public.registrar_cobro((select id from ord where turno = 932), 'efectivo', null, null, null, (select usuario from fx))$$,
  '23514', 'La caja está cerrada: ábrela para registrar cobros',
  'Con la caja cerrada no se cobra'
);

select isnt(
  public.reabrir_caja((select id from public.cajas where jornada_id = (select id from public.jornadas where fecha = '2031-03-05')), (select usuario from fx)),
  null, 'Reabre la caja cerrada'
);

select results_eq(
  $$select estado, efectivo_esperado is null from public.cajas where jornada_id = (select id from public.jornadas where fecha = '2031-03-05')$$,
  $$values ('abierta'::text, true)$$,
  'Al reabrir se limpia el arqueo'
);

-- ---------------- Crédito: vales y pago ----------------
select throws_ok(
  $$select public.registrar_pago_credito_con_medio((select id from public.clientes where documento = '900000930'), array[(select id from ord where turno = 930)], (select usuario from fx), 'transferencia')$$,
  '23514', 'Solo se pagan órdenes con el vale verificado',
  'Sin vale verificado no se paga'
);

select throws_ok(
  $$update public.vales_credito set numero = 'OTRO-1' where orden_id = (select id from ord where turno = 930)$$,
  '23514', 'De un vale solo cambia su verificación',
  'El número del vale no cambia'
);

update public.vales_credito set verificado_en = now(), verificado_por = (select usuario from fx)
  where orden_id = (select id from ord where turno = 930);

select throws_ok(
  $$select public.registrar_pago_credito_con_medio((select id from public.clientes where documento = '900000930'), array[(select id from ord where turno = 930)], (select usuario from fx), 'tarjeta')$$,
  '23514', 'El medio del pago debe ser transferencia, cheque o efectivo',
  'El medio del pago es de la lista cerrada'
);

select isnt(
  public.registrar_pago_credito_con_medio((select id from public.clientes where documento = '900000930'),
    array[(select id from ord where turno = 930)], (select usuario from fx), 'transferencia'),
  null, 'Paga las órdenes con el vale verificado'
);

select results_eq(
  $$select d.medio from public.detalles_pago_credito d
    join public.ordenes_lavado o on o.pago_credito_id = d.pago_credito_id
    where o.id = (select id from ord where turno = 930)$$,
  $$values ('transferencia'::text)$$,
  'El pago guarda su medio'
);

select throws_ok(
  $$update public.vales_credito set verificado_en = null, verificado_por = null where orden_id = (select id from ord where turno = 930)$$,
  '23514', 'El vale de una orden ya pagada no cambia',
  'El vale de una orden pagada queda fijo'
);

select throws_ok(
  $$update public.clientes set cupo_credito = 1000000 where documento = '1000000930'$$,
  '23514', null,
  'Solo una empresa tiene cupo de crédito'
);

-- ---------------- Inventario ----------------
insert into public.insumos (nombre, categoria, unidad, stock, stock_minimo) values ('Insumo Modulos', 'Lavado', 'litros', 5, 3);

select throws_ok(
  $$select public.registrar_movimiento_inventario((select id from public.insumos where nombre = 'Insumo Modulos'), -6, null, (select usuario from fx))$$,
  '23514', 'El stock de Insumo Modulos no puede quedar en negativo',
  'El stock nunca queda en negativo'
);

select is(
  public.registrar_movimiento_inventario((select id from public.insumos where nombre = 'Insumo Modulos'), 3, 'Compra', (select usuario from fx)),
  8, 'Una entrada suma al stock'
);

select results_eq(
  $$select cantidad, stock_resultante from public.movimientos_inventario where insumo_id = (select id from public.insumos where nombre = 'Insumo Modulos')$$,
  $$values (3, 8)$$,
  'El movimiento queda registrado con el stock que dejó'
);

update public.insumos set estado = 'inactivo' where nombre = 'Insumo Modulos';

select throws_ok(
  $$select public.registrar_movimiento_inventario((select id from public.insumos where nombre = 'Insumo Modulos'), 1, null, (select usuario from fx))$$,
  '23514', 'Un insumo inactivo no recibe movimientos',
  'Un insumo inactivo no se mueve'
);

-- ---------------- Tokens de jornada ----------------
select ok(
  not has_table_privilege('authenticated', 'public.tokens_jornada', 'SELECT'),
  'Ningún rol de la aplicación lee los tokens del QR'
);

-- ---------------- Reportes y nómina ----------------
select results_eq(
  $$select servicios, ingresos from public.reporte_ventas_por_dia('2031-03-05', '2031-03-05')$$,
  $$values (3, 60000::bigint)$$,
  'Ventas del día: servicios e ingresos sin canceladas'
);

select results_eq(
  $$select servicios, ingresos, comision from public.reporte_colaboradores('2031-03-01', '2031-03-15') where codigo = 930$$,
  $$values (3, 60000::bigint, 24000::bigint)$$,
  'Por colaborador: servicios, ingresos y comisión (40 %)'
);

select results_eq(
  $$select sum(ingresos)::bigint from public.reporte_ingresos_por_hora('2031-03-05')$$,
  $$values (60000::bigint)$$,
  'La curva por hora suma los ingresos del día'
);

insert into public.descuentos_colaborador (colaborador_id, fecha, tipo, valor, registrado_por) values
  ((select id from public.colaboradores where codigo = 930), '2031-03-06', 'jabon', 4000, (select usuario from fx));

select results_eq(
  $$select servicios, comision, jabon, descuentos, neto, saldo_pendiente from public.resumen_nomina_periodo('2031-03-01', '2031-03-15') where codigo = 930$$,
  $$values (3, 24000, 4000, 4000, 20000, 0)$$,
  'El resumen de nómina calcula como la liquidación: neto = comisión − descuentos'
);

select * from finish();
rollback;
