# 0004 — Políticas RLS por rol como defensa en profundidad (SCRUM-147)

**Estado:** Aceptado.

## Contexto

Desde la Fase 1 (SCRUM-145), las 11 tablas de `public` tienen `enable row level security`, pero ninguna tenía políticas: `anon` y `authenticated` quedaban con cero privilegios (`revoke all on table ... from anon, authenticated` en cada migración `crear_*`). La API siempre se conecta con la `service_role` key (ver `apps/api/src/db/supabaseCliente.js`), que en Supabase tiene el atributo `BYPASSRLS` — confirmado contra `pg_roles` (`service_role`/`postgres` con `rolbypassrls = true`; `anon`/`authenticated` con `false`). La autorización real de cada petición HTTP vive en los middlewares de `apps/api` (`autenticarJWT` + `autorizarRoles`, ver ADR 0003), nunca en Postgres.

El Estándar de Normalización del equipo (§7.2) fija que "las políticas por rol llegan en el Bloque 11" — es decir, se sabía desde el diseño inicial que esta ausencia de políticas era temporal, no un descuido.

## Decisión

Se agregan políticas RLS por rol a las 11 tablas (migración `agregar_politicas_rls_por_rol`), como **defensa en profundidad**: modelan en Postgres la misma matriz de permisos que ya aplican los middlewares de la API, sin cambiar en nada el comportamiento de la API. Si alguna vez se usan las claves `anon`/`authenticated` directamente contra PostgREST — un panel de BI, un cliente que hable con Supabase en vez de con la API, una fuga de la clave `anon` — las políticas ya reflejan la matriz correcta, en vez de exponer todo (si solo se hubiera dado un `GRANT` amplio) o bloquear todo de forma inútil (el estado anterior, que tampoco servía de nada porque la API nunca pasa por ahí).

### Por qué la API sigue con `service_role`

No se migra la API a usar las claves `anon`/`authenticated` ni Supabase Auth en este cambio. `service_role` sigue siendo la única credencial que usa `apps/api` contra Supabase. Las políticas de esta migración existen para el escenario en que alguien (o algo) distinto de la API hable directamente con Postgres/PostgREST, no para que la API empiece a depender de RLS para su propia autorización — esa sigue siendo responsabilidad exclusiva de sus middlewares.

### Cómo se lee el rol: `public.rol_actual()`

```sql
select nullif(
  current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'rol',
  ''
);
```

Lee el claim `app_metadata.rol` del JWT que PostgREST ya verificó — el lugar estándar de Supabase Auth para metadata de aplicación que el usuario final no puede modificar por su cuenta (a diferencia de `user_metadata`). Devuelve `null` si no hay claim (una petición anónima, o un JWT sin ese campo).

**Importante:** la API de CarWash **no usa Supabase Auth hoy**. Emite su propio JWT, firmado con un secreto propio (`JWT_SECRET` en `apps/api/.env`), que es **distinto** del secreto con el que PostgREST verifica JWT (`JWT_SECRET` del stack de Supabase, confirmado en `npx supabase status` — son dos valores diferentes incluso en desarrollo local). Esto significa que:

- El JWT de la API nunca llega a PostgREST tal cual (la API no lo reenvía; siempre usa `service_role`).
- Aunque llegara, PostgREST no podría verificarlo (secreto distinto) y lo rechazaría antes de que `request.jwt.claims` se poblara.
- Por lo tanto, `rol_actual()` y las políticas que dependen de él son código inerte frente al tráfico real de hoy — listas para cuando (si) la API migre a Supabase Auth.

### Qué haría falta para migrar la API a Supabase Auth (fuera de alcance, ticket futuro)

1. Reemplazar `src/utils/jwt.util.js` (firma y verificación propias) por el flujo de Supabase Auth (`supabase.auth.signInWithPassword`, o emitir el JWT propio pero firmado con el secreto de Supabase y con la forma exacta que PostgREST espera — `app_metadata`, `role`, `aud`, etc.).
2. Decidir si `usuarios` se fusiona con `auth.users` (la tabla interna de Supabase Auth) o se mantiene aparte y se sincroniza — hoy `usuarios` es 100% propia, sin relación con `auth.users`.
3. Decidir, caso por caso, si cada endpoint sigue pasando por `service_role` (como hoy) o empieza a reenviar el JWT del usuario final a Supabase/PostgREST — y si hace eso, las políticas de este ADR pasan de ser defensa en profundidad inerte a ser la autorización real de esa ruta.
4. Reescribir el bootstrap del superadmin (`crearSuperAdmin.js`) para crear también la identidad en Supabase Auth, no solo la fila en `usuarios`.
5. Correr de nuevo toda la suite de `supabase/tests/politicas_rls_test.sql` contra tráfico real (no solo simulado con `set_config`), para confirmar que el claim que realmente emite Supabase Auth tiene la forma que `rol_actual()` espera.

Ninguno de estos puntos se resuelve en SCRUM-147; quedan como alcance de un ticket futuro de migración a Supabase Auth.

### Matriz tabla × rol × operación

`pendiente` y `anon` no aparecen en la tabla: no tienen ninguna política en ninguna de las 11 tablas (acceso nulo, sin excepción).

| Tabla | SELECT | INSERT | UPDATE | DELETE |
| --- | --- | --- | --- | --- |
| `usuarios` | superadmin, administrador, soporte (columnas, sin `password_hash`) | — | superadmin (solo columna `rol`) | — (ni `service_role`, nunca se borran) |
| `colaboradores` | superadmin, administrador, soporte | superadmin, administrador | superadmin, administrador | superadmin, administrador |
| `servicios` | superadmin, administrador, soporte | superadmin, administrador | superadmin, administrador | superadmin, administrador |
| `tarifas_servicio` | superadmin, administrador, soporte | superadmin, administrador | superadmin, administrador | superadmin, administrador |
| `clientes` | superadmin, administrador, soporte | superadmin, administrador | superadmin, administrador | superadmin, administrador |
| `vehiculos` | superadmin, administrador, soporte | superadmin, administrador | superadmin, administrador | superadmin, administrador |
| `jornadas` | superadmin, administrador, soporte | superadmin, administrador, soporte | superadmin, administrador, soporte — **excepto** reabrir (`estado → 'abierta'`): solo superadmin | — |
| `reaperturas_jornada` | superadmin, administrador, soporte | superadmin | — | — (ni `service_role`) |
| `ordenes_lavado` | superadmin, administrador, soporte | superadmin, administrador, soporte | superadmin, administrador, soporte — **excepto** anular (`estado → 'cancelada'`): solo superadmin, administrador | — (bloqueado para todos por `impedir_eliminacion`) |
| `parametros_negocio` | superadmin, administrador, soporte | — (ni `service_role`, fila única) | superadmin | — (ni `service_role`) |
| `auditoria` | superadmin | — (ni `service_role`; solo vía `registrar_auditoria()`, `security definer`) | — (ni `service_role`) | — (ni `service_role`) |

Esta matriz coincide con `PUEDEN_CONSULTAR`/`PUEDEN_GESTIONAR` (y las excepciones condicionales `exigirSuperadminParaReabrir`/`exigirPermisoParaCancelar`) de los middlewares de `apps/api`, para `colaboradores`, `servicios`, `clientes`, `vehiculos`, `jornadas` y `ordenes_lavado` — no se encontró ninguna inconsistencia entre el código de los middlewares y el ADR 0003 al derivarla.

### Decisiones donde el ADR 0003 y los middlewares no alcanzan (criterio propio, documentado aquí)

El ADR 0003 no cubre `usuarios`, `parametros_negocio`, `tarifas_servicio`, `reaperturas_jornada` ni `auditoria` (son posteriores, de SCRUM-152/SCRUM-146). Para esas tablas:

- `tarifas_servicio` y `reaperturas_jornada` no tienen rutas HTTP propias (van anidadas en la respuesta de `servicios`/`jornadas`): heredan el criterio de su tabla padre.
- `parametros_negocio` y `auditoria` sí tienen middlewares propios y explícitos (`parametros.routes.js`, y las restricciones de `crear_auditoria.sql`), de ahí se derivó su fila de la matriz directamente.
- `usuarios`: no existe hoy un endpoint HTTP de lectura general (`SCRUM-141`, pendiente según el ADR 0003 — "fuera de alcance de esta decisión"). Se optó por un criterio conservador: los tres roles operativos pueden consultar usuarios sin `password_hash` (defensa en profundidad razonable, no abre nada que la API no vaya a necesitar cuando se construya `SCRUM-141`); solo `superadmin` puede mutar, y solo la columna `rol` (coincide exactamente con `PATCH /api/auth/usuarios/:id/rol`, la única mutación que existe hoy).

## Fuera de alcance de esta decisión

- Migrar la API a Supabase Auth o a usar las claves `anon`/`authenticated` (ver sección de arriba) — ticket futuro.
- `SCRUM-141` (administración de usuarios): cuando se construya, su matriz de permisos HTTP debe revisarse contra la fila de `usuarios` de este ADR, no asumirse automáticamente correcta.
- Cambiar el alcance de la tarifa de Servicios a solo-superadmin (nota ya existente en el ADR 0003, sin resolver).

## Consecuencias

- Las 11 tablas pasan de "RLS habilitado, sin ninguna política" (que en la práctica es "nadie de `anon`/`authenticated` puede nada, de forma accidental") a "RLS habilitado, con una matriz de políticas explícita y documentada" — mismo resultado práctico hoy (nadie fuera de la API usa esas claves), pero ahora es una decisión explícita, no un vacío.
- `supabase/tests/politicas_rls_test.sql` cubre la matriz completa (permitido y denegado, por rol, por tabla) y confirma que `service_role` conserva acceso total — las pruebas de la API no se ven afectadas por esta migración.
- Si en el futuro la API empieza a reenviar el JWT del usuario final a Supabase (migración a Supabase Auth), estas políticas pasan de ser defensa en profundidad inerte a ser la autorización real de esa ruta — por eso importa que la matriz quede correcta y documentada desde ahora, no solo "por si acaso".
