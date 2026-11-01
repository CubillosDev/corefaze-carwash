-- Políticas RLS por rol (Bloque 11, SCRUM-147): defensa en profundidad.
--
-- La API sigue usando service_role (ignora RLS) y la autorización real
-- del tráfico de la API sigue viviendo en sus middlewares
-- (autenticarJWT/autorizarRoles, ver ADR 0003). Esta migración modela, a
-- nivel de Postgres, la MISMA matriz de permisos que esos middlewares ya
-- aplican, para que un acceso directo con las claves anon/authenticated
-- (PostgREST) respete la misma matriz aunque la API nunca la ejercite hoy.
-- Ver el ADR nuevo de esta migración para el detalle completo (incluye
-- por qué rol_actual() queda inerte hasta una futura migración a
-- Supabase Auth).

-- ============================================================
-- rol_actual(): lee el rol de negocio desde el claim del JWT.
-- ============================================================

create function public.rol_actual()
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select nullif(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb -> 'app_metadata' ->> 'rol',
    ''
  );
$$;

comment on function public.rol_actual() is
  'Rol de negocio (superadmin/administrador/soporte/pendiente) leído del claim app_metadata.rol del JWT verificado por PostgREST. Devuelve null si no hay claim (anon, o un JWT sin ese campo). Es la base de las políticas RLS de esta migración; la API real nunca la ejercita hoy porque siempre usa service_role y firma su propio JWT con un secreto distinto al de PostgREST (ver ADR de esta migración).';

revoke execute on function public.rol_actual() from public, anon;
grant execute on function public.rol_actual() to authenticated, service_role;

-- ============================================================
-- Tablas "estándar": consultar = superadmin/administrador/soporte,
-- gestionar (insert/update/delete) = superadmin/administrador. Mismo
-- criterio que sus rutas en apps/api (PUEDEN_CONSULTAR/PUEDEN_GESTIONAR):
-- colaboradores, servicios, tarifas_servicio (va anidada con servicios,
-- sin ruta propia, mismo criterio que su tabla padre), clientes, vehiculos.
-- Un solo bloque dinámico para no repetir a mano las mismas 4 políticas
-- (select/insert/update/delete) cinco veces.
-- ============================================================

do $$
declare
  v_tabla text;
  v_roles_consulta constant text[] := array['superadmin', 'administrador', 'soporte'];
  v_roles_gestion constant text[] := array['superadmin', 'administrador'];
  v_sufijo_consulta constant text := array_to_string(v_roles_consulta, '_');
  v_sufijo_gestion constant text := array_to_string(v_roles_gestion, '_');
begin
  foreach v_tabla in array array['colaboradores', 'servicios', 'tarifas_servicio', 'clientes', 'vehiculos']
  loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', v_tabla);

    execute format(
      $pol$create policy %I on public.%I for select to authenticated
         using ((select public.rol_actual()) = any (%L::text[]))$pol$,
      v_tabla || '_select_' || v_sufijo_consulta, v_tabla, v_roles_consulta
    );
    execute format(
      'comment on policy %I on public.%I is %L',
      v_tabla || '_select_' || v_sufijo_consulta, v_tabla,
      format('Consultar %s: superadmin, administrador y soporte (igual que PUEDEN_CONSULTAR en apps/api).', v_tabla)
    );

    execute format(
      $pol$create policy %I on public.%I for insert to authenticated
         with check ((select public.rol_actual()) = any (%L::text[]))$pol$,
      v_tabla || '_insert_' || v_sufijo_gestion, v_tabla, v_roles_gestion
    );
    execute format(
      'comment on policy %I on public.%I is %L',
      v_tabla || '_insert_' || v_sufijo_gestion, v_tabla,
      format('Crear en %s: solo superadmin y administrador (igual que PUEDEN_GESTIONAR en apps/api).', v_tabla)
    );

    execute format(
      $pol$create policy %I on public.%I for update to authenticated
         using ((select public.rol_actual()) = any (%L::text[]))
         with check ((select public.rol_actual()) = any (%L::text[]))$pol$,
      v_tabla || '_update_' || v_sufijo_gestion, v_tabla, v_roles_gestion, v_roles_gestion
    );
    execute format(
      'comment on policy %I on public.%I is %L',
      v_tabla || '_update_' || v_sufijo_gestion, v_tabla,
      format('Editar en %s: solo superadmin y administrador (igual que PUEDEN_GESTIONAR en apps/api).', v_tabla)
    );

    execute format(
      $pol$create policy %I on public.%I for delete to authenticated
         using ((select public.rol_actual()) = any (%L::text[]))$pol$,
      v_tabla || '_delete_' || v_sufijo_gestion, v_tabla, v_roles_gestion
    );
    execute format(
      'comment on policy %I on public.%I is %L',
      v_tabla || '_delete_' || v_sufijo_gestion, v_tabla,
      format('Eliminar en %s: solo superadmin y administrador (igual que PUEDEN_GESTIONAR en apps/api).', v_tabla)
    );
  end loop;
end;
$$;

-- ============================================================
-- usuarios: caso especial por columnas. authenticated nunca puede leer
-- password_hash, y la única mutación que la API expone fuera del
-- bootstrap es PATCH /api/auth/usuarios/:id/rol (solo superadmin, solo
-- la columna rol). Sin INSERT (el registro público usa service_role, sin
-- JWT todavía) ni DELETE (nunca se borran, se desactivan — service_role
-- mismo ya lo tiene revocado, ver crear_usuarios.sql).
-- ============================================================

grant select (id, nombre, email, rol, activo, intentos_fallidos, bloqueado_hasta, creado_en, actualizado_en)
  on public.usuarios to authenticated;
grant update (rol) on public.usuarios to authenticated;

create policy usuarios_select_superadmin_administrador_soporte
  on public.usuarios for select to authenticated
  using ((select public.rol_actual()) = any (array['superadmin', 'administrador', 'soporte']));

comment on policy usuarios_select_superadmin_administrador_soporte on public.usuarios is
  'Consultar usuarios (sin password_hash, restringido por GRANT de columnas): superadmin, administrador y soporte. No existe hoy un endpoint HTTP de lectura general de usuarios (SCRUM-141 pendiente); esta política es defensa en profundidad para cuando exista.';

create policy usuarios_update_superadmin
  on public.usuarios for update to authenticated
  using ((select public.rol_actual()) = 'superadmin')
  with check ((select public.rol_actual()) = 'superadmin');

comment on policy usuarios_update_superadmin on public.usuarios is
  'Modificar usuarios (restringido a la columna rol por GRANT de columnas): solo superadmin — coincide con PATCH /api/auth/usuarios/:id/rol.';

-- ============================================================
-- jornadas: abrir/cerrar/editar es para los tres roles operativos.
-- Reabrir es la excepción (criterio de aceptación de SCRUM-139, ADR 0003
-- y exigirSuperadminParaReabrir): solo superadmin puede dejar el estado
-- en 'abierta' mediante un UPDATE (reabrir una jornada ya cerrada; abrir
-- una jornada NUEVA es un INSERT, no pasa por esta política). Sin DELETE
-- (la API nunca lo expone).
-- ============================================================

grant select, insert, update on public.jornadas to authenticated;

create policy jornadas_select_superadmin_administrador_soporte
  on public.jornadas for select to authenticated
  using ((select public.rol_actual()) = any (array['superadmin', 'administrador', 'soporte']));

comment on policy jornadas_select_superadmin_administrador_soporte on public.jornadas is
  'Consultar jornadas: superadmin, administrador y soporte (igual que PUEDEN_CONSULTAR en jornadas.routes.js).';

create policy jornadas_insert_superadmin_administrador_soporte
  on public.jornadas for insert to authenticated
  with check ((select public.rol_actual()) = any (array['superadmin', 'administrador', 'soporte']));

comment on policy jornadas_insert_superadmin_administrador_soporte on public.jornadas is
  'Abrir una jornada (INSERT): superadmin, administrador y soporte (igual que PUEDEN_GESTIONAR en jornadas.routes.js).';

create policy jornadas_update_superadmin_administrador_soporte
  on public.jornadas for update to authenticated
  using ((select public.rol_actual()) = any (array['superadmin', 'administrador', 'soporte']))
  with check (
    (select public.rol_actual()) = 'superadmin'
    or estado is distinct from 'abierta'
  );

comment on policy jornadas_update_superadmin_administrador_soporte on public.jornadas is
  'Cerrar o reabrir una jornada: superadmin, administrador y soporte. Reabrir (dejar estado en ''abierta'' vía UPDATE) queda reservado a superadmin — igual que exigirSuperadminParaReabrir en jornadas.routes.js.';

-- ============================================================
-- reaperturas_jornada: registro de solo inserción, efecto de reabrir una
-- jornada (superadmin únicamente). Visible para quien puede consultar
-- jornadas (va anidada en la respuesta). Sin UPDATE/DELETE: ya bloqueado
-- incluso para service_role (ver crear_reaperturas_jornada.sql).
-- ============================================================

grant select, insert on public.reaperturas_jornada to authenticated;

create policy reaperturas_jornada_select_superadmin_administrador_soporte
  on public.reaperturas_jornada for select to authenticated
  using ((select public.rol_actual()) = any (array['superadmin', 'administrador', 'soporte']));

comment on policy reaperturas_jornada_select_superadmin_administrador_soporte on public.reaperturas_jornada is
  'Consultar reaperturas: superadmin, administrador y soporte — mismo criterio que consultar jornadas, porque van anidadas en esa respuesta.';

create policy reaperturas_jornada_insert_superadmin
  on public.reaperturas_jornada for insert to authenticated
  with check ((select public.rol_actual()) = 'superadmin');

comment on policy reaperturas_jornada_insert_superadmin on public.reaperturas_jornada is
  'Insertar una reapertura: solo superadmin — es el efecto de reabrir una jornada, reservado a ese rol.';

-- ============================================================
-- ordenes_lavado: registrar/editar/avanzar estado es para los tres roles
-- operativos. Anular (cancelar) es la excepción (ADR 0003 y
-- exigirPermisoParaCancelar): soporte puede editar y avanzar cualquier
-- estado salvo dejarlo en 'cancelada'. Sin DELETE (bloqueado para todos
-- por impedir_eliminacion, ver crear_reglas_ordenes_lavado.sql).
-- ============================================================

grant select, insert, update on public.ordenes_lavado to authenticated;

create policy ordenes_lavado_select_superadmin_administrador_soporte
  on public.ordenes_lavado for select to authenticated
  using ((select public.rol_actual()) = any (array['superadmin', 'administrador', 'soporte']));

comment on policy ordenes_lavado_select_superadmin_administrador_soporte on public.ordenes_lavado is
  'Consultar órdenes de lavado: superadmin, administrador y soporte (igual que PUEDEN_CONSULTAR en ordenesLavado.routes.js).';

create policy ordenes_lavado_insert_superadmin_administrador_soporte
  on public.ordenes_lavado for insert to authenticated
  with check ((select public.rol_actual()) = any (array['superadmin', 'administrador', 'soporte']));

comment on policy ordenes_lavado_insert_superadmin_administrador_soporte on public.ordenes_lavado is
  'Registrar una orden de lavado: superadmin, administrador y soporte — es el trabajo central del operador.';

create policy ordenes_lavado_update_superadmin_administrador_soporte
  on public.ordenes_lavado for update to authenticated
  using ((select public.rol_actual()) = any (array['superadmin', 'administrador', 'soporte']))
  with check (
    (select public.rol_actual()) = any (array['superadmin', 'administrador'])
    or estado is distinct from 'cancelada'
  );

comment on policy ordenes_lavado_update_superadmin_administrador_soporte on public.ordenes_lavado is
  'Editar o avanzar el estado de una orden: superadmin, administrador y soporte. Anular (dejar estado en ''cancelada'' vía UPDATE) queda reservado a superadmin y administrador — igual que exigirPermisoParaCancelar en ordenesLavado.routes.js.';

-- ============================================================
-- parametros_negocio: fila única (id=1). Consultar es para los tres
-- roles operativos; actualizar (costos y comisión del negocio) solo
-- para superadmin. Sin INSERT/DELETE: ya bloqueado incluso para
-- service_role (ver crear_parametros_negocio.sql).
-- ============================================================

grant select, update on public.parametros_negocio to authenticated;

create policy parametros_negocio_select_superadmin_administrador_soporte
  on public.parametros_negocio for select to authenticated
  using ((select public.rol_actual()) = any (array['superadmin', 'administrador', 'soporte']));

comment on policy parametros_negocio_select_superadmin_administrador_soporte on public.parametros_negocio is
  'Consultar parámetros de negocio: superadmin, administrador y soporte (igual que PUEDEN_CONSULTAR en parametros.routes.js).';

create policy parametros_negocio_update_superadmin
  on public.parametros_negocio for update to authenticated
  using ((select public.rol_actual()) = 'superadmin')
  with check ((select public.rol_actual()) = 'superadmin');

comment on policy parametros_negocio_update_superadmin on public.parametros_negocio is
  'Actualizar parámetros de negocio: solo superadmin (igual que PUEDEN_ACTUALIZAR en parametros.routes.js).';

-- ============================================================
-- auditoria: solo lectura, solo para superadmin. Sin INSERT/UPDATE/DELETE
-- para nadie (ni policy ni grant): ya bloqueado incluso para service_role
-- (ver crear_auditoria.sql) — solo la escribe registrar_auditoria(),
-- security definer.
-- ============================================================

grant select on public.auditoria to authenticated;

create policy auditoria_select_superadmin
  on public.auditoria for select to authenticated
  using ((select public.rol_actual()) = 'superadmin');

comment on policy auditoria_select_superadmin on public.auditoria is
  'Consultar auditoría: solo superadmin. Nadie más la lee, nadie la modifica ni la borra (ni siquiera service_role, ver crear_auditoria.sql).';
