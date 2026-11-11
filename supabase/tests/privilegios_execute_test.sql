begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

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
-- Causa raíz, no solo el síntoma: los DEFAULT PRIVILEGES de postgres
-- para funciones nuevas (pg_default_acl) no deben incluir EXECUTE para
-- PUBLIC/anon/authenticated en el esquema public (ni en el default
-- global, sin esquema) — así, cualquier función que se cree a partir de
-- ahora (en cualquier rama, sin que su propia migración tenga que
-- acordarse de revocar PUBLIC) nace ya cerrada. Antes de
-- 20261030120000_corregir_privilegios_execute_funciones.sql, pg_proc
-- demostraba el síntoma (PUBLIC con EXECUTE) y esta prueba hubiera
-- fallado también.
--
-- Acotado a (esquema public) o (sin esquema, el default global): otros
-- esquemas administrados por Supabase (storage, auth, realtime, ...)
-- traen su propia default ACL con anon/authenticated, y eso es correcto
-- — no es nuestro esquema, no creamos funciones ahí, y no es parte de
-- este fix tocarlo.
-- ============================================================

select is(
  (
    select count(*)::int
    from pg_default_acl d
    left join pg_namespace n on n.oid = d.defaclnamespace
    join lateral aclexplode(d.defaclacl) a on true
    where d.defaclrole = 'postgres'::regrole
      and d.defaclobjtype = 'f'
      and (n.nspname = 'public' or n.nspname is null)
      and a.privilege_type = 'EXECUTE'
      and (a.grantee = 0 or a.grantee in ('anon'::regrole, 'authenticated'::regrole))
  ),
  0,
  'los default privileges de postgres para funciones nuevas en public (y el default global) no incluyen EXECUTE para PUBLIC/anon/authenticated (pg_default_acl)'
);

-- ============================================================
-- Excepción pedida por el revisor en el esquema extensions: el revoke
-- de PUBLIC de arriba es global ("for role postgres" sin "in schema"),
-- y la preocupación es que sin esta excepción también apagaría el
-- EXECUTE de PUBLIC sobre las funciones que crea
-- `create extension pgtap with schema extensions`, rompiendo
-- `set local role service_role;` en cualquier prueba. En este entorno
-- (ver migración y el reporte) `postgres` no es superusuario real y
-- las funciones de pgTAP quedan con proowner = supabase_admin, así que
-- el "for role postgres" nunca las toca de todas formas — pero la
-- excepción se agrega igual (inocua, defensa correcta si la relación
-- de ownership cambiara). Documenta el resultado esperado: EXECUTE
-- para PUBLIC SÍ sigue por defecto en extensions, aunque ya no en
-- public ni en el default global.
-- ============================================================

select is(
  (
    select count(*)::int
    from pg_default_acl d
    join pg_namespace n on n.oid = d.defaclnamespace
    join lateral aclexplode(d.defaclacl) a on true
    where d.defaclrole = 'postgres'::regrole
      and d.defaclobjtype = 'f'
      and n.nspname = 'extensions'
      and a.grantee = 0
      and a.privilege_type = 'EXECUTE'
  ),
  1,
  'excepción documentada: en el esquema extensions, los default privileges de postgres SÍ incluyen EXECUTE para PUBLIC (para no romper las funciones de pgTAP)'
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
