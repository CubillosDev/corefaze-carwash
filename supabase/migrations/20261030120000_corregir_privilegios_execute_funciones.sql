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
