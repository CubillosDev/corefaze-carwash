-- Borra SOLO los datos de demostración que crea scripts/seed-demo.js.
--
--   docker exec -i supabase_db_<proyecto> psql -U postgres -d postgres < scripts/borrar-demo.sql
--
-- Identifica los datos por sus marcas: órdenes con observaciones que empiezan
-- por [DEMO], clientes y usuarios con correo @corefaze.demo, y jornadas
-- abiertas por esos usuarios. No toca nada más.
--
-- Las órdenes de lavado no se pueden borrar por diseño (trigger
-- impedir_eliminacion): el trigger se desactiva solo dentro de esta
-- transacción y se vuelve a activar antes de confirmar. Los usuarios no se
-- borran (el dominio los desactiva) y la auditoría no se modifica.

begin;

create temporary table usuarios_demo on commit drop as
  select id from public.usuarios where email like '%@corefaze.demo';

alter table public.ordenes_lavado disable trigger trg_ordenes_lavado_impedir_eliminar;

delete from public.ordenes_lavado where observaciones like '[DEMO]%';

alter table public.ordenes_lavado enable trigger trg_ordenes_lavado_impedir_eliminar;

delete from public.reaperturas_jornada
  where jornada_id in (select id from public.jornadas where abierta_por in (select id from usuarios_demo));

delete from public.jornadas j
  where j.abierta_por in (select id from usuarios_demo)
    and not exists (select 1 from public.ordenes_lavado o where o.jornada_id = j.id);

delete from public.vehiculos v
  using public.clientes c
  where v.cliente_id = c.id
    and c.email like '%@corefaze.demo'
    and not exists (select 1 from public.ordenes_lavado o where o.vehiculo_id = v.id);

delete from public.clientes c
  where c.email like '%@corefaze.demo'
    and not exists (select 1 from public.vehiculos v where v.cliente_id = c.id);

-- La carga cerró la jornada abierta que existía antes (solo puede haber una
-- abierta). Se reabre si la cerró un usuario de demostración y no quedó otra.
update public.jornadas
  set estado = 'abierta', cerrada_en = null, cerrada_por = null
  where cerrada_por in (select id from usuarios_demo)
    and abierta_por not in (select id from usuarios_demo)
    and not exists (select 1 from public.jornadas otra where otra.estado = 'abierta');

update public.usuarios set activo = false where id in (select id from usuarios_demo);

commit;
