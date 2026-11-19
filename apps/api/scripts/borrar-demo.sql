-- Borra SOLO los datos de demostración que crea scripts/seed-demo.js.
--
--   docker exec -i supabase_db_<proyecto> psql -U postgres -d postgres < scripts/borrar-demo.sql
--
-- Identifica los datos por sus marcas: órdenes con observaciones que empiezan
-- por [DEMO], clientes y usuarios con correo @corefaze.demo, jornadas abiertas
-- por esos usuarios (y sus cajas), insumos con un movimiento [DEMO] y
-- descuentos de nómina [DEMO]. No toca nada más.
--
-- Órdenes, cajas, cobros, egresos, vales, pagos de crédito, insumos y sus
-- movimientos, descuentos y tokens de jornada no se pueden borrar por diseño
-- (triggers *_sin_eliminar): cada trigger se desactiva solo dentro de esta
-- transacción y se vuelve a activar antes de confirmar. Los usuarios no se
-- borran (el dominio los desactiva), la auditoría no se modifica y las
-- liquidaciones de nómina, si alguien liquidó una quincena, se conservan.

begin;

create temporary table usuarios_demo on commit drop as
  select id from public.usuarios where email like '%@corefaze.demo';

create temporary table ordenes_demo on commit drop as
  select id from public.ordenes_lavado where observaciones like '[DEMO]%';

create temporary table cajas_demo on commit drop as
  select c.id
  from public.cajas c
  join public.jornadas j on j.id = c.jornada_id
  where j.abierta_por in (select id from usuarios_demo);

create temporary table pagos_demo on commit drop as
  select p.id
  from public.pagos_credito p
  join public.clientes c on c.id = p.cliente_id
  where c.email like '%@corefaze.demo';

create temporary table insumos_demo on commit drop as
  select distinct insumo_id as id
  from public.movimientos_inventario
  where observacion like '[DEMO]%';

-- Caja: cobros y egresos antes que las cajas.
alter table public.cobros_caja disable trigger trg_cobros_caja_sin_eliminar;
delete from public.cobros_caja
  where orden_id in (select id from ordenes_demo) or caja_id in (select id from cajas_demo);
alter table public.cobros_caja enable trigger trg_cobros_caja_sin_eliminar;

alter table public.egresos_caja disable trigger trg_egresos_caja_sin_eliminar;
delete from public.egresos_caja where caja_id in (select id from cajas_demo);
alter table public.egresos_caja enable trigger trg_egresos_caja_sin_eliminar;

alter table public.cajas disable trigger trg_cajas_sin_eliminar;
delete from public.cajas where id in (select id from cajas_demo);
alter table public.cajas enable trigger trg_cajas_sin_eliminar;

-- Crédito: vales y detalles antes que las órdenes; los pagos, después.
alter table public.vales_credito disable trigger trg_vales_credito_sin_eliminar;
delete from public.vales_credito where orden_id in (select id from ordenes_demo);
alter table public.vales_credito enable trigger trg_vales_credito_sin_eliminar;

alter table public.detalles_pago_credito disable trigger trg_detalles_pago_credito_sin_eliminar;
delete from public.detalles_pago_credito where pago_credito_id in (select id from pagos_demo);
alter table public.detalles_pago_credito enable trigger trg_detalles_pago_credito_sin_eliminar;

alter table public.ordenes_lavado disable trigger trg_ordenes_lavado_impedir_eliminar;
delete from public.ordenes_lavado where id in (select id from ordenes_demo);
alter table public.ordenes_lavado enable trigger trg_ordenes_lavado_impedir_eliminar;

alter table public.pagos_credito disable trigger trg_pagos_credito_sin_eliminar;
delete from public.pagos_credito where id in (select id from pagos_demo);
alter table public.pagos_credito enable trigger trg_pagos_credito_sin_eliminar;

-- Códigos QR de la jornada que generaron los usuarios de demostración.
alter table public.tokens_jornada disable trigger trg_tokens_jornada_sin_eliminar;
delete from public.tokens_jornada where creado_por in (select id from usuarios_demo);
alter table public.tokens_jornada enable trigger trg_tokens_jornada_sin_eliminar;

-- Nómina e inventario.
alter table public.descuentos_colaborador disable trigger trg_descuentos_colaborador_sin_eliminar;
delete from public.descuentos_colaborador where observacion like '[DEMO]%';
alter table public.descuentos_colaborador enable trigger trg_descuentos_colaborador_sin_eliminar;

alter table public.movimientos_inventario disable trigger trg_movimientos_inventario_sin_eliminar;
delete from public.movimientos_inventario where insumo_id in (select id from insumos_demo);
alter table public.movimientos_inventario enable trigger trg_movimientos_inventario_sin_eliminar;

alter table public.insumos disable trigger trg_insumos_sin_eliminar;
delete from public.insumos where id in (select id from insumos_demo);
alter table public.insumos enable trigger trg_insumos_sin_eliminar;

-- Jornadas, vehículos y clientes que quedaron sin órdenes.
delete from public.reaperturas_jornada
  where jornada_id in (select id from public.jornadas where abierta_por in (select id from usuarios_demo));

delete from public.jornadas j
  where j.abierta_por in (select id from usuarios_demo)
    and not exists (select 1 from public.ordenes_lavado o where o.jornada_id = j.id)
    and not exists (select 1 from public.cajas c where c.jornada_id = j.id)
    and not exists (select 1 from public.tokens_jornada t where t.jornada_id = j.id);

delete from public.vehiculos v
  using public.clientes c
  where v.cliente_id = c.id
    and c.email like '%@corefaze.demo'
    and not exists (select 1 from public.ordenes_lavado o where o.vehiculo_id = v.id);

delete from public.clientes c
  where c.email like '%@corefaze.demo'
    and not exists (select 1 from public.vehiculos v where v.cliente_id = c.id)
    and not exists (select 1 from public.ordenes_lavado o where o.cliente_id = c.id)
    and not exists (select 1 from public.pagos_credito p where p.cliente_id = c.id);

-- La carga cerró la jornada abierta que existía antes (solo puede haber una
-- abierta). Se reabre si la cerró un usuario de demostración y no quedó otra.
update public.jornadas
  set estado = 'abierta', cerrada_en = null, cerrada_por = null
  where cerrada_por in (select id from usuarios_demo)
    and abierta_por not in (select id from usuarios_demo)
    and not exists (select 1 from public.jornadas otra where otra.estado = 'abierta');

update public.usuarios set activo = false where id in (select id from usuarios_demo);

commit;
