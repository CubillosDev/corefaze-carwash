begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

select tables_are(
  'public',
  array[
    'auditoria', 'clientes', 'colaboradores', 'jornadas', 'ordenes_lavado', 'parametros_negocio',
    'reaperturas_jornada', 'servicios', 'tarifas_servicio', 'usuarios', 'vehiculos'
  ],
  'El esquema public tiene exactamente las tablas del modelo'
);

select is_empty($q$
  with recursive fk as (
    select c.conrelid::regclass::text as hija, c.confrelid::regclass::text as padre
    from pg_constraint c
    join pg_namespace n on n.oid = c.connamespace
    where c.contype = 'f' and n.nspname = 'public'
  ),
  camino (origen, actual, ruta, ciclo) as (
    select hija, padre, array[hija, padre], hija = padre from fk
    union all
    select c.origen, fk.padre, c.ruta || fk.padre, fk.padre = c.origen
    from camino c
    join fk on fk.hija = c.actual
    where not c.ciclo and (fk.padre = c.origen or not fk.padre = any (c.ruta))
  )
  select array_to_string(ruta, ' -> ') from camino where ciclo
$q$, 'No hay ciclos de llaves foráneas (el modelo es un grafo acíclico)');

select is_empty($q$
  select t.relname
  from pg_class t join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public' and t.relkind = 'r'
    and not exists (select 1 from pg_constraint c where c.conrelid = t.oid and c.contype = 'p')
$q$, 'Toda tabla tiene llave primaria');

select is_empty($q$
  select c.conrelid::regclass::text || '.' || c.conname
  from pg_constraint c join pg_namespace n on n.oid = c.connamespace
  where c.contype = 'f' and n.nspname = 'public'
    and not exists (
      select 1 from pg_index i
      where i.indrelid = c.conrelid
        and (string_to_array(i.indkey::text, ' ')::int2[])[1:cardinality(c.conkey)] @> c.conkey
        and (string_to_array(i.indkey::text, ' ')::int2[])[1:cardinality(c.conkey)] <@ c.conkey
    )
$q$, 'Toda llave foránea tiene un índice que empieza por sus columnas');

select is_empty($q$
  select c.conrelid::regclass::text || '.' || c.conname
  from pg_constraint c join pg_namespace n on n.oid = c.connamespace
  where c.contype = 'f' and n.nspname = 'public' and c.confdeltype <> 'r'
    and c.conname <> 'tarifas_servicio_servicio_id_fkey'
$q$, 'Toda llave foránea es ON DELETE RESTRICT (salvo tarifas_servicio)');

select is_empty($q$
  select t.relname
  from pg_class t join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public' and t.relkind = 'r' and not t.relrowsecurity
$q$, 'Toda tabla tiene RLS habilitado');

select is_empty($q$
  select r.rolname || ' en ' || t.relname
  from pg_class t
  join pg_namespace n on n.oid = t.relnamespace
  cross join pg_roles r
  where n.nspname = 'public' and t.relkind = 'r' and r.rolname in ('anon', 'authenticated')
    and (has_table_privilege(r.oid, t.oid, 'SELECT') or has_table_privilege(r.oid, t.oid, 'INSERT')
      or has_table_privilege(r.oid, t.oid, 'UPDATE') or has_table_privilege(r.oid, t.oid, 'DELETE'))
$q$, 'anon y authenticated no tienen permisos sobre ninguna tabla');

select is_empty($q$
  select c.conrelid::regclass::text || '.' || c.conname
  from pg_constraint c join pg_namespace n on n.oid = c.connamespace
  where n.nspname = 'public' and c.contype in ('p', 'u', 'f', 'c')
    and c.conname !~ case c.contype when 'p' then '_pkey$' when 'u' then '_key$' when 'f' then '_fkey$' else '_check$' end
$q$, 'Toda restricción tiene nombre con sufijo estándar (_pkey, _key, _fkey, _check)');

select is_empty($q$
  select i.indexrelid::regclass::text
  from pg_index i
  join pg_class t on t.oid = i.indrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and not exists (select 1 from pg_constraint c where c.conindid = i.indexrelid)
    and i.indexrelid::regclass::text !~ '^(public\.)?idx_'
$q$, 'Todo índice propio se llama idx_<tabla>_<columnas>');

select is_empty($q$
  select t.relname
  from pg_class t join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public' and t.relkind = 'r'
    and not exists (
      select 1 from pg_attribute a where a.attrelid = t.oid and a.attname = 'creado_en' and not a.attisdropped
    )
$q$, 'Toda tabla tiene creado_en');

select is_empty($q$
  select t.relname
  from pg_class t join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public' and t.relkind = 'r'
    and exists (
      select 1 from pg_attribute a where a.attrelid = t.oid and a.attname = 'actualizado_en' and not a.attisdropped
    )
    and not exists (
      select 1 from pg_trigger g join pg_proc p on p.oid = g.tgfoid
      where g.tgrelid = t.oid and p.proname = 'asignar_actualizado_en' and not g.tgisinternal
    )
$q$, 'Toda tabla con actualizado_en tiene el trigger que lo asigna');

select is_empty($q$
  select t.relname
  from pg_class t join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public' and t.relkind = 'r'
    and (t.relname = 'auditoria') = exists (
      select 1 from pg_trigger g join pg_proc p on p.oid = g.tgfoid
      where g.tgrelid = t.oid and p.proname = 'registrar_auditoria' and not g.tgisinternal
    )
$q$, 'Toda tabla de negocio se audita y auditoria no se audita a sí misma');

select is_empty($q$
  select p.proname
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) cfg where cfg like 'search_path=%')
$q$, 'Toda función propia fija search_path');

select * from finish();
rollback;
