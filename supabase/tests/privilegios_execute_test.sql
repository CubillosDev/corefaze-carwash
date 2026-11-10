begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

-- ============================================================
-- reemplazar_tarifas_servicio(): anon/authenticated sin EXECUTE,
-- service_role sí. Antes de 20261030120000_corregir_privilegios_execute_
-- funciones.sql, anon/authenticated SÍ podían ejecutarla (el revoke
-- original nunca tocaba PUBLIC).
-- ============================================================

select is(
  has_function_privilege('anon', 'public.reemplazar_tarifas_servicio(bigint, jsonb)', 'execute'),
  false,
  'anon NO puede ejecutar reemplazar_tarifas_servicio()'
);
select is(
  has_function_privilege('authenticated', 'public.reemplazar_tarifas_servicio(bigint, jsonb)', 'execute'),
  false,
  'authenticated NO puede ejecutar reemplazar_tarifas_servicio()'
);
select is(
  has_function_privilege('service_role', 'public.reemplazar_tarifas_servicio(bigint, jsonb)', 'execute'),
  true,
  'service_role SÍ puede ejecutar reemplazar_tarifas_servicio()'
);

-- has_function_privilege() no distingue el pseudo-rol PUBLIC de un rol
-- literal llamado "public" (que no existe): para probar que PUBLIC en
-- sí no tiene EXECUTE hay que leer pg_proc.proacl directamente
-- (aclexplode) y confirmar que ninguna entrada con grantee = 0 (PUBLIC)
-- otorga EXECUTE.
select is(
  (
    select count(*)::int
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    join lateral aclexplode(p.proacl) a on true
    where n.nspname = 'public'
      and p.proname = 'reemplazar_tarifas_servicio'
      and a.grantee = 0
      and a.privilege_type = 'EXECUTE'
  ),
  0,
  'PUBLIC no tiene EXECUTE sobre reemplazar_tarifas_servicio (verificado en pg_proc.proacl, no solo has_function_privilege)'
);

-- ============================================================
-- Regresión estructural: ningún rol anon puede ejecutar NINGUNA función
-- del esquema public (las de extensiones viven en otro esquema, nunca en
-- public, así que ya quedan fuera solo por el filtro de esquema).
-- Lista de excepciones EXPLÍCITA y vacía. A propósito dinámica (recorre
-- pg_proc, no una lista fija de nombres de hoy): debe seguir pasando
-- cuando se mergeen las ramas pendientes (rol_actual() y las funciones
-- de créditos/nómina ya revocan EXECUTE de public/anon en sus propias
-- migraciones).
-- ============================================================

select is(
  (
    select coalesce(
      array_agg(p.proname || '(' || pg_get_function_arguments(p.oid) || ')' order by p.proname),
      array[]::text[]
    )
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and has_function_privilege('anon', p.oid, 'execute')
      and p.proname <> all (array[]::text[]) -- excepciones explícitas: ninguna
  ),
  array[]::text[],
  'ninguna función de public da EXECUTE a anon (lista de excepciones explícita: vacía)'
);

select * from finish();
rollback;
