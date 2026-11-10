-- Corrige privilegios EXECUTE del esquema public (defensa en profundidad).
--
-- reemplazar_tarifas_servicio() (agregar_reemplazar_tarifas_servicio.sql,
-- PR #12/SCRUM-152) intentó restringir su RPC con:
--   revoke execute on function ... from anon, authenticated;
-- pero NUNCA revocó de PUBLIC. CREATE FUNCTION concede EXECUTE a PUBLIC
-- por defecto, y ese grant por sí solo ya le da el privilegio a
-- CUALQUIER rol — anon/authenticated lo heredaban de PUBLIC sin
-- necesitar un grant propio, así que revocárselo a ellos directamente
-- fue, en la práctica, un no-op (nunca tuvieron un grant EXPLÍCITO que
-- revocar). Confirmado con aclexplode(proacl) y has_function_privilege()
-- antes de este fix: anon/authenticated SÍ podían ejecutarla.
--
-- Patrón correcto (el que ya usa registrar_auditoria() desde
-- activar_auditoria.sql): revocar de PUBLIC explícitamente, no solo de
-- los roles de la API. anon/authenticated quedan cubiertos por quedar
-- excluidos de PUBLIC; no hace falta repetirlos, pero se listan también
-- por claridad y para que un futuro grant directo a alguno de ellos no
-- pase inadvertido en un diff.

revoke execute on function public.reemplazar_tarifas_servicio(bigint, jsonb)
  from public, anon, authenticated;
grant execute on function public.reemplazar_tarifas_servicio(bigint, jsonb)
  to service_role;

comment on function public.reemplazar_tarifas_servicio(bigint, jsonb) is
  'Todo o nada: borra las tarifas actuales del servicio e inserta las nuevas dentro de la misma transacción. Si el INSERT falla (p. ej. tipo_vehiculo duplicado por tarifas_servicio_servicio_tipo_key), Postgres revierte también el DELETE. Solo service_role: revocado también de PUBLIC (no solo de anon/authenticated, que es lo que hacía el revoke original en agregar_reemplazar_tarifas_servicio.sql y no bastaba — ver 20261030120000_corregir_privilegios_execute_funciones.sql).';

-- ============================================================
-- Funciones de trigger (asignar_actualizado_en, impedir_cambios_auditoria,
-- impedir_eliminacion, preparar_orden_lavado, proteger_orden_lavado):
-- la auditoría del paso 1 mostró que las 5 tenían EXECUTE para
-- public/anon/authenticated (el default de CREATE FUNCTION, nunca
-- revocado). A diferencia de reemplazar_tarifas_servicio, esto NO abre
-- una puerta real: Postgres rechaza llamar una función RETURNS TRIGGER
-- fuera de un trigger sin importar el EXECUTE que tenga
-- ("ERROR: trigger functions can only be called as triggers",
-- confirmado probándolo), y confirmado también que revocar EXECUTE no
-- rompe el disparo del trigger para ningún rol (el motor de triggers de
-- Postgres invoca la función directamente, sin pasar por la verificación
-- de EXECUTE que sí aplica a una llamada explícita — probado revocando
-- EXECUTE de impedir_eliminacion() incluso a service_role y confirmando
-- que su trigger en ordenes_lavado seguía disparando la excepción).
-- Aun así, se revocan por consistencia con registrar_auditoria() (que ya
-- solo da EXECUTE a service_role desde activar_auditoria.sql) y como
-- defensa en profundidad: ningún rol de la API necesita ejecutar una
-- función de trigger directamente, y no conviene depender únicamente
-- del comportamiento interno de Postgres como única barrera.
-- ============================================================

revoke execute on function public.asignar_actualizado_en()
  from public, anon, authenticated;
grant execute on function public.asignar_actualizado_en() to service_role;

revoke execute on function public.impedir_cambios_auditoria()
  from public, anon, authenticated;
grant execute on function public.impedir_cambios_auditoria() to service_role;

revoke execute on function public.impedir_eliminacion()
  from public, anon, authenticated;
grant execute on function public.impedir_eliminacion() to service_role;

revoke execute on function public.preparar_orden_lavado()
  from public, anon, authenticated;
grant execute on function public.preparar_orden_lavado() to service_role;

revoke execute on function public.proteger_orden_lavado()
  from public, anon, authenticated;
grant execute on function public.proteger_orden_lavado() to service_role;

comment on function public.asignar_actualizado_en() is
  'Trigger BEFORE UPDATE: mantiene actualizado_en sin depender de la API. Revocado de PUBLIC/anon/authenticated (defensa en profundidad): Postgres ya impide llamar una función de trigger fuera de un trigger, y revocar EXECUTE no afecta su disparo (confirmado), pero no conviene depender solo de eso.';
comment on function public.impedir_cambios_auditoria() is
  'Trigger BEFORE UPDATE/DELETE/TRUNCATE en auditoria: rechaza modificarla o eliminarla. Revocado de PUBLIC/anon/authenticated (defensa en profundidad), misma razón que asignar_actualizado_en().';
comment on function public.impedir_eliminacion() is
  'Trigger BEFORE DELETE/TRUNCATE genérico: rechaza la eliminación con el mensaje recibido como argumento (SQLSTATE 23001). Revocado de PUBLIC/anon/authenticated (defensa en profundidad), misma razón que asignar_actualizado_en().';
comment on function public.preparar_orden_lavado() is
  'Trigger BEFORE INSERT en ordenes_lavado: congela el porcentaje_comision vigente del colaborador. Revocado de PUBLIC/anon/authenticated (defensa en profundidad), misma razón que asignar_actualizado_en().';
comment on function public.proteger_orden_lavado() is
  'Trigger BEFORE UPDATE en ordenes_lavado: una orden entregada/cancelada no se modifica; valor/servicio/jornada/fecha/turno/creado_en son inmutables; reasignar colaborador recalcula su % congelado. Revocado de PUBLIC/anon/authenticated (defensa en profundidad), misma razón que asignar_actualizado_en().';

-- ============================================================
-- Causa raíz: DEFAULT PRIVILEGES. Lo de arriba corrige las funciones que
-- YA EXISTÍAN con el problema, pero no evita que la MISMA fuga vuelva a
-- pasar con la próxima función nueva: CREATE FUNCTION concede EXECUTE a
-- PUBLIC por defecto, y esto es así AUNQUE ya exista una fila en
-- pg_default_acl con GRANTs explícitos a otros roles — Supabase ya trae
-- una default ACL para (rol postgres, esquema public, funciones) que
-- agrega EXECUTE explícito a anon/authenticated/service_role, pero esa
-- fila NO suprime el baseline interno de Postgres que además le da
-- EXECUTE a PUBLIC a toda función nueva. Confirmado creando una función
-- de prueba (en una transacción, revertida) ANTES de este fix: su
-- proacl incluía una entrada con grantee vacío (PUBLIC) además de
-- postgres/anon/authenticated/service_role.
--
-- La única forma de apagar ese baseline es un REVOKE explícito de
-- PUBLIC a nivel de DEFAULT PRIVILEGES — no alcanza con revocarlo
-- función por función después de creada (eso es lo que hace esta
-- migración arriba, pero solo para las que ya existían).
--
-- "for role postgres" (sin "in schema"): nuestras migraciones SIEMPRE
-- corren como el rol postgres (confirmado: todas las funciones del
-- esquema son propiedad de postgres), así que esto es lo que importa
-- para esta base. Se deja sin acotar a un esquema porque postgres no
-- debería crear NINGUNA función en NINGÚN esquema con EXECUTE abierto a
-- PUBLIC por defecto — defensa en profundidad también ante un futuro
-- esquema nuevo.
--
-- anon/authenticated sí se acotan "in schema public": son roles de la
-- API, relevantes solo ahí; no se tocan en otros esquemas (auth,
-- storage, etc. — administrados por Supabase, no por estas migraciones).
-- No revocarlos aquí sería redundante en la práctica (sin EXECUTE de
-- PUBLIC, ya no lo heredan), pero se deja explícito para que un futuro
-- GRANT directo a cualquiera de los dos, en una función nueva, no pase
-- inadvertido en un diff — mismo criterio que los revokes individuales
-- de arriba.
--
-- No cambia nada para las funciones que SÍ necesitan EXECUTE de
-- authenticated (rol_actual(), comision_orden(), limites_quincena(),
-- comision_colaborador_periodo(), prestamos_colaborador_periodo(),
-- validar_cobertura_prestamos_colaborador()): esas siguen otorgándolo
-- con un GRANT explícito en sus propias migraciones, después de crearse
-- — el default privileges solo decide qué pasa si NADIE otorga nada.
-- ============================================================

alter default privileges for role postgres
  revoke execute on functions from public;

alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated;
