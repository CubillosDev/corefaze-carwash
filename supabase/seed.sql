-- Seed SOLO LOCAL (ver supabase/README.md): nunca se aplica al proyecto
-- remoto. Todos los nombres, documentos, placas y teléfonos son
-- ficticios. Se inserta en orden de niveles: usuarios → catálogos →
-- vehículos → jornadas → órdenes. Nunca se escriben ids: todo se
-- referencia por llave natural (código, número, placa, documento, email,
-- fecha).

-- ============================================================
-- Usuarios (Fase 1) — uno por rol
-- ============================================================
-- Hash bcrypt (costo 10) generado con la misma librería de la API
-- (apps/api, "node -e \"require('bcrypt').hash(...)\""). La contraseña de
-- prueba NO se documenta aquí: va en el informe final de la Fase 1.
insert into public.usuarios (nombre, email, password_hash, rol) values
  ('Dueño Car Wash', 'dueno@carwash.test', '$2b$10$X48LH9eA1zQPvaolVmF3qOGejkxJ9S2s/hO3TCk/1FKGriT1zd60C', 'superadmin'),
  ('Administrador Car Wash', 'administrador@carwash.test', '$2b$10$X48LH9eA1zQPvaolVmF3qOGejkxJ9S2s/hO3TCk/1FKGriT1zd60C', 'administrador'),
  ('Soporte Car Wash', 'soporte@carwash.test', '$2b$10$X48LH9eA1zQPvaolVmF3qOGejkxJ9S2s/hO3TCk/1FKGriT1zd60C', 'soporte'),
  ('Usuario Pendiente', 'pendiente@carwash.test', '$2b$10$X48LH9eA1zQPvaolVmF3qOGejkxJ9S2s/hO3TCk/1FKGriT1zd60C', 'pendiente');

-- Atribuye la auditoría del resto de este seed al dueño (sin efecto
-- hasta la Fase 2, que es cuando existe la tabla auditoria).
select set_config('app.usuario_id', (select id::text from public.usuarios where email = 'dueno@carwash.test'), false);

-- ============================================================
-- Catálogo de servicios y tarifas (Fase 1)
-- Listado de precios vigente desde el 01/08/2026.
-- ============================================================

insert into public.servicios (numero, nombre, descripcion, categoria) values
  (1, 'Lavado simple', 'Lavado exterior', 'lavado'),
  (2, 'Lavado exclusivo', 'Lavado exterior + aspirado', 'lavado'),
  (3, 'Super exclusivo I', 'Enjuague + chasis', 'lavado'),
  (4, 'Super exclusivo II', 'Enjuague + chasis + grafito', 'lavado'),
  (5, 'Super exclusivo III', 'Enjuague + motor', 'lavado'),
  (6, 'Elite I', 'Enjuague + chasis + motor', 'lavado'),
  (7, 'Elite II', 'Enjuague + chasis + motor + grafito', 'lavado'),
  (8, 'Elite III', 'Enjuague + lavado de motor a vapor', 'lavado'),
  (9, 'Super combo', 'Tapicería + enjuague + sillas + techo + alfombra', 'tapiceria'),
  (10, 'Lavado premium', 'Lavado premium', 'lavado'),
  (13, 'Silletería', 'Lavado de silletería', 'tapiceria'),
  (14, 'Techos', 'Lavado de techos', 'tapiceria'),
  (15, 'Alfombras', 'Lavado de alfombras', 'tapiceria');

insert into public.tarifas_servicio (servicio_id, tipo_vehiculo, valor)
select s.id, v.tipo_vehiculo, v.valor
from (
  values
    (1, 'automovil', 22000), (1, 'camioneta', 25000), (1, 'platon_7_pasajeros', 26000),
    (2, 'automovil', 28000), (2, 'camioneta', 35000), (2, 'platon_7_pasajeros', 38000),
    (3, 'automovil', 47000), (3, 'camioneta', 51000), (3, 'platon_7_pasajeros', 57000),
    (4, 'automovil', 55000), (4, 'camioneta', 59000), (4, 'platon_7_pasajeros', 62000),
    (5, 'automovil', 63000), (5, 'camioneta', 68000), (5, 'platon_7_pasajeros', 73000),
    (6, 'automovil', 72000), (6, 'camioneta', 79000), (6, 'platon_7_pasajeros', 81000),
    (7, 'automovil', 78000), (7, 'camioneta', 84000), (7, 'platon_7_pasajeros', 86000),
    (8, 'automovil', 100000), (8, 'camioneta', 110000), (8, 'platon_7_pasajeros', 120000),
    (9, 'automovil', 490000), (9, 'camioneta', 540000), (9, 'platon_7_pasajeros', 550000),
    (10, 'automovil', 48000), (10, 'camioneta', 55000), (10, 'platon_7_pasajeros', 60000),
    (13, 'automovil', 220000), (13, 'camioneta', 240000), (13, 'platon_7_pasajeros', 260000),
    (14, 'automovil', 220000), (14, 'camioneta', 240000), (14, 'platon_7_pasajeros', 260000),
    (15, 'automovil', 220000), (15, 'camioneta', 240000), (15, 'platon_7_pasajeros', 260000)
) as v (numero_tmp, tipo_vehiculo, valor)
join public.servicios s on s.numero = v.numero_tmp;

-- Motos (estándar 5.5): tres servicios con tarifa por cilindraje.
-- DECISIÓN PENDIENTE DE CONFIRMAR CON EL EQUIPO: la ficha preliminar no
-- fija si "lavado de moto"/"grafito"/"polichada" son servicios propios
-- (como aquí) o variantes de los servicios 1 y 4. Se modelan como
-- servicios propios (11, 12, 16) porque es lo único consistente con
-- serviciosConLavadoMotor = [5,6,7,8] (ninguna moto está ahí) y con que
-- tarifas_servicio exige una fila por tipo_vehiculo soportado.
insert into public.servicios (numero, nombre, descripcion, categoria) values
  (11, 'Lavado de moto', 'Lavado de motocicleta', 'lavado'),
  (12, 'Aplicación de grafito (moto)', 'Grafito para motocicleta', 'lavado'),
  (16, 'Polichada (moto)', 'Polichada para motocicleta', 'lavado');

insert into public.tarifas_servicio (servicio_id, tipo_vehiculo, valor)
select s.id, v.tipo_vehiculo, v.valor
from (
  values
    (11, 'moto_hasta_150cc', 18000), (11, 'moto_desde_150cc', 21000),
    (12, 'moto_hasta_150cc', 24000), (12, 'moto_desde_150cc', 27000),
    (16, 'moto_hasta_150cc', 35000), (16, 'moto_desde_150cc', 35000)
) as v (numero_tmp, tipo_vehiculo, valor)
join public.servicios s on s.numero = v.numero_tmp;

-- ============================================================
-- Colaboradores (Fase 1): 13 ficticios, códigos 401-413
-- ============================================================

insert into public.colaboradores (codigo, nombre, documento, telefono, porcentaje_comision, tipo_vinculacion) values
  (401, 'Juan Pérez', '1020300401', '3010000401', 0.37, 'fijo'),
  (402, 'María Gómez', '1020300402', '3010000402', 0.37, 'fijo'),
  (403, 'Carlos Rodríguez', '1020300403', '3010000403', 0.37, 'ocasional'),
  (404, 'Ana Martínez', '1020300404', '3010000404', 0.37, 'fijo'),
  (405, 'Luis Hernández', '1020300405', '3010000405', 0.37, 'ocasional'),
  (406, 'Diana López', '1020300406', '3010000406', 0.37, 'fijo'),
  (407, 'Jorge Díaz', '1020300407', '3010000407', 0.37, 'fijo'),
  (408, 'Paula Torres', '1020300408', '3010000408', 0.37, 'ocasional'),
  (409, 'Andrés Ramírez', '1020300409', '3010000409', 0.37, 'fijo'),
  (410, 'Camila Vargas', '1020300410', '3010000410', 0.37, 'fijo'),
  (411, 'Felipe Castro', '1020300411', '3010000411', 0.37, 'ocasional'),
  (412, 'Natalia Ortiz', '1020300412', '3010000412', 0.37, 'fijo'),
  (413, 'Sergio Morales', '1020300413', '3010000413', 0.37, 'ocasional');

-- 413 queda inactivo (dentro del período de gracia de 15 días).
update public.colaboradores
set estado = 'inactivo', inactivo_desde = now() - interval '5 days'
where codigo = 413;

-- ============================================================
-- Clientes (Fase 1): 10 ficticios — 6 particulares, 4 empresas
-- (3 con crédito, 1 inactiva)
-- ============================================================

insert into public.clientes (nombre, documento, tipo, telefono) values
  ('Laura Jiménez', '1030400001', 'particular', '3020000001'),
  ('Ricardo Suárez', '1030400002', 'particular', '3020000002'),
  ('Patricia Rojas', '1030400003', 'particular', '3020000003'),
  ('Mauricio Peña', '1030400004', 'particular', '3020000004'),
  ('Catalina Mejía', '1030400005', 'particular', '3020000005'),
  ('Esteban Guzmán', '1030400006', 'particular', '3020000006');

insert into public.clientes (nombre, documento, tipo, telefono, credito_habilitado, estado) values
  ('Transportes Ejemplo S.A.S.', '900100001', 'empresa', '3020000007', true, 'activo'),
  ('Comercializadora Prueba Ltda', '900100002', 'empresa', '3020000008', true, 'activo'),
  ('Distribuidora Ficticia S.A.', '900100003', 'empresa', '3020000009', true, 'activo'),
  ('Servicios Imaginarios S.A.S.', '900100004', 'empresa', '3020000010', false, 'inactivo');

-- ============================================================
-- Vehículos (Fase 1): 15 ficticios (prefijo ZZ), al menos 2 motos de
-- cada cilindraje
-- ============================================================

insert into public.vehiculos (placa, tipo_vehiculo, cliente_id)
select v.placa, v.tipo_vehiculo, c.id
from (
  values
    ('ZZA101', 'automovil', '1030400001'),
    ('ZZA102', 'camioneta', '1030400001'),
    ('ZZA103', 'automovil', '1030400002'),
    ('ZZA104', 'platon_7_pasajeros', '1030400003'),
    ('ZZA105', 'automovil', '1030400004'),
    ('ZZA106', 'automovil', '1030400005'),
    ('ZZA107', 'camioneta', '1030400006'),
    ('ZZA108', 'automovil', '900100001'),
    ('ZZA109', 'camioneta', '900100002'),
    ('ZZA110', 'automovil', '900100003'),
    ('ZZA111', 'platon_7_pasajeros', '900100004')
) as v (placa, tipo_vehiculo, documento_cliente)
join public.clientes c on c.documento = v.documento_cliente;

insert into public.vehiculos (placa, tipo_vehiculo, cliente_id)
select v.placa, v.tipo_vehiculo, c.id
from (
  values
    ('ZZM10A', 'moto_hasta_150cc', '1030400001'),
    ('ZZM11A', 'moto_hasta_150cc', '1030400002'),
    ('ZZM12A', 'moto_desde_150cc', '1030400003'),
    ('ZZM13A', 'moto_desde_150cc', '1030400004')
) as v (placa, tipo_vehiculo, documento_cliente)
join public.clientes c on c.documento = v.documento_cliente;

-- ============================================================
-- Jornada cerrada (2026-08-03): 12 órdenes, todos los medios de pago,
-- 2 a crédito, 1 cancelada con motivo, el resto entregadas.
-- ============================================================

insert into public.jornadas (fecha, estado, abierta_en, abierta_por, cerrada_en, cerrada_por)
values (
  '2026-08-03', 'cerrada',
  '2026-08-03 07:00:00-05', (select id from public.usuarios where email = 'administrador@carwash.test'),
  '2026-08-03 19:00:00-05', (select id from public.usuarios where email = 'administrador@carwash.test')
);

insert into public.ordenes_lavado (
  jornada_id, fecha, turno, vehiculo_id, servicio_id, colaborador_id, medio_pago,
  autoriza_motor, cliente_id, valor, estado, motivo
)
select
  j.id, j.fecha, d.turno, v.id, s.id, c.id, d.medio_pago,
  d.autoriza_motor, cli.id, ts.valor, d.estado, d.motivo
from (
  values
    (1, 'ZZA101', 1, 401, 'efectivo', false, null::text, 'entregada', null::text),
    (2, 'ZZA102', 2, 402, 'nequi', false, null, 'entregada', null),
    (3, 'ZZA103', 3, 403, 'daviplata', false, null, 'entregada', null),
    (4, 'ZZA104', 4, 404, 'bancolombia', false, null, 'entregada', null),
    (5, 'ZZA105', 5, 405, 'datafono', true, null, 'entregada', null),
    (6, 'ZZA106', 1, 406, 'credito', false, '900100001', 'entregada', null),
    (7, 'ZZA107', 2, 407, 'credito', false, '900100002', 'entregada', null),
    (8, 'ZZA108', 6, 408, 'efectivo', true, null, 'cancelada', 'El cliente no llegó'),
    (9, 'ZZA109', 3, 409, 'nequi', false, null, 'entregada', null),
    (10, 'ZZA110', 4, 410, 'daviplata', false, null, 'entregada', null),
    (11, 'ZZA111', 7, 411, 'bancolombia', true, null, 'entregada', null),
    (12, 'ZZM10A', 11, 412, 'datafono', false, null, 'entregada', null)
) as d (turno, placa, numero_servicio, codigo_colaborador, medio_pago, autoriza_motor, documento_cliente, estado, motivo)
join public.jornadas j on j.fecha = '2026-08-03'
join public.vehiculos v on v.placa = d.placa
join public.servicios s on s.numero = d.numero_servicio
join public.colaboradores c on c.codigo = d.codigo_colaborador
left join public.clientes cli on cli.documento = d.documento_cliente
join public.tarifas_servicio ts on ts.servicio_id = s.id and ts.tipo_vehiculo = v.tipo_vehiculo;

-- ============================================================
-- Jornada abierta (2026-08-04): 3 órdenes — registrada, en_proceso,
-- terminada.
-- ============================================================

insert into public.jornadas (fecha, abierta_en, abierta_por)
values (
  '2026-08-04', '2026-08-04 07:00:00-05',
  (select id from public.usuarios where email = 'administrador@carwash.test')
);

insert into public.ordenes_lavado (
  jornada_id, fecha, turno, vehiculo_id, servicio_id, colaborador_id, medio_pago, valor, estado
)
select
  j.id, j.fecha, d.turno, v.id, s.id, c.id, d.medio_pago, ts.valor, d.estado
from (
  values
    (1, 'ZZM11A', 12, 401, 'efectivo', 'registrada'),
    (2, 'ZZM12A', 11, 402, 'nequi', 'en_proceso'),
    (3, 'ZZM13A', 16, 403, 'efectivo', 'terminada')
) as d (turno, placa, numero_servicio, codigo_colaborador, medio_pago, estado)
join public.jornadas j on j.fecha = '2026-08-04'
join public.vehiculos v on v.placa = d.placa
join public.servicios s on s.numero = d.numero_servicio
join public.colaboradores c on c.codigo = d.codigo_colaborador
join public.tarifas_servicio ts on ts.servicio_id = s.id and ts.tipo_vehiculo = v.tipo_vehiculo;

-- ============================================================
-- Parámetros del negocio (Fase 2): la fila (id = 1) ya la crea la
-- migración 12 — aquí solo se actualiza con valores ficticios redondos.
-- ============================================================

update public.parametros_negocio
set
  nombre_negocio = 'Car Wash Demo',
  nit = '900999888-1',
  direccion = 'Calle Falsa 123',
  telefono = '3000000000',
  porcentaje_comision = 0.37,
  descontar_comision_diaria = false,
  costo_arriendo = 2000000,
  costo_luz = 300000,
  costo_agua = 200000,
  costo_nomina_fija = 1500000,
  costo_depreciacion = 100000,
  costo_insumos = 500000,
  costo_variable_lavado = 5000,
  precio_promedio_referencia = 40000,
  tope_prestamo_colaborador = 200000,
  dias_operacion_mes = 30,
  actualizado_por = (select id from public.usuarios where email = 'administrador@carwash.test')
where id = 1;
