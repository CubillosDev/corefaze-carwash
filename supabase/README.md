# Base de datos — Car Wash

Esquema de la base de datos del proyecto, como migraciones versionadas de Supabase CLI. Ver también [`docs/arquitectura/diagramas/modelo-datos.md`](../docs/arquitectura/diagramas/modelo-datos.md) para el diagrama ER y la matriz BD vs. API.

**Estado actual: Fase 2 (SCRUM-146) completa**, 14 migraciones (11 tablas + funciones comunes + triggers de `ordenes_lavado` + auditoría). El esquema queda cerrado.

## Requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) corriendo.
- [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) (pinneada como devDependency de la raíz del monorepo: `npm i -D supabase`). Se invoca con `npx supabase`.

## Comandos

Desde la raíz del monorepo:

```bash
npx supabase start      # levanta Postgres local + Studio + el resto del stack, en Docker
npx supabase db reset    # recrea la base desde cero: corre las migraciones y luego el seed
npx supabase test db     # corre las pruebas pgTAP de supabase/tests/
npx supabase db lint     # revisa el esquema por problemas comunes
npx supabase migration new <nombre>   # crea una migración nueva con timestamp
npx supabase stop        # detiene el stack local
```

Antes de cada commit sobre `supabase/`, corre los tres en este orden:

```bash
npx supabase db reset && npx supabase test db && npx supabase db lint
```

## Orden de las migraciones

| # | Migración | Tabla o efecto | Nivel | Fase |
| --- | --- | --- | --- | --- |
| 01 | `crear_funciones_comunes` | `asignar_actualizado_en()`, `impedir_eliminacion()` | — | 1 |
| 02 | `crear_usuarios` | `usuarios` | 0 | 1 |
| 03 | `crear_colaboradores` | `colaboradores` | 0 | 1 |
| 04 | `crear_servicios` | `servicios` | 0 | 1 |
| 05 | `crear_tarifas_servicio` | `tarifas_servicio` | 1 | 1 |
| 06 | `crear_clientes` | `clientes` | 0 | 1 |
| 07 | `crear_vehiculos` | `vehiculos` | 1 | 1 |
| 08 | `crear_jornadas` | `jornadas` | 1 | 1 |
| 09 | `crear_reaperturas_jornada` | `reaperturas_jornada` | 2 | 1 |
| 10 | `crear_ordenes_lavado` | `ordenes_lavado` | 2 | 1 |
| 11 | `crear_reglas_ordenes_lavado` | triggers de órdenes | — | 1 |
| 12 | `crear_parametros_negocio` | `parametros_negocio` | 1 | 2 |
| 13 | `crear_auditoria` | `auditoria` | 1 | 2 |
| 14 | `activar_auditoria` | `registrar_auditoria()` y triggers | — | 2 |

Detalle de qué depende de qué, y por qué `usuarios` se adelantó a la Fase 1: ver la tabla de niveles en `docs/arquitectura/diagramas/modelo-datos.md`.

## Seed — solo local

`supabase/seed.sql` corre automáticamente en cada `db reset`. Contiene **solo datos ficticios** (usuarios, colaboradores, clientes, vehículos, jornadas, órdenes de prueba, y un `UPDATE` sobre la fila única de `parametros_negocio`) y **nunca se aplica al proyecto remoto**: el remoto no recibe seed, ni usuarios de prueba, ni datos ficticios bajo ninguna circunstancia. La contraseña de los 4 usuarios de prueba del seed no está en el repositorio; la tiene el equipo por fuera (informes de la Fase 1 y la Fase 2).

## El proyecto remoto no se gestiona desde aquí

Nadie corre `supabase login`, `link`, `db push`, `db reset --linked`, `db pull`, `migration repair` ni `db dump --linked` desde este repositorio. El enlace y la aplicación de migraciones al proyecto Supabase real los gestiona Diego Cubillos directamente, con su propio acceso, fase por fase: al cerrar cada fase local (migraciones + `test db` + `db lint` en verde), se le entrega la lista exacta de migraciones creadas (mismo nombre, mismo orden) para que las aplique él mismo al remoto.

## Contrato de integración con la API (SCRUM-152)

Cuando los services de `apps/api` pasen de datos en memoria a Supabase, estas son las reglas de integración:

- **Nombres de columnas**: cada columna es el snake_case exacto de la llave JSON que la API ya usa (`apps/api/src/utils/mapearCampos.js` convierte automáticamente). Las únicas excepciones se resuelven con alias de PostgREST en el `select`:

  | Recurso | JSON actual de la API | Cómo se lee de la BD |
  | --- | --- | --- |
  | Servicios | `tarifas: [{ tipoVehiculo, valor }]` | `select('id, numero, nombre, descripcion, categoria, activo, tarifas:tarifas_servicio(tipo_vehiculo, valor)')` |
  | Jornadas | `reaperturas: [{ en }]` | `..., reaperturas:reaperturas_jornada(en:creado_en)` |
  | Órdenes | `creadaEn` | `..., creada_en:creado_en` |
  | Jornadas | `abiertaPor` / `cerradaPor` | Pasan a guardar el **id** del usuario (`sub` del JWT), no el email que usa hoy la API en memoria (ver ADR 0003 y `modelo-datos.md`) |

- **Columnas explícitas**: cada service lista sus columnas en el `select`, nunca `*`. Así nunca se filtran `password_hash`, `creado_en`, `actualizado_en` ni `porcentaje_comision` mientras el contrato HTTP no las incluya.
- **Usuario de auditoría** (Fase 2): la API envía el header `x-usuario-id` (el `sub` del JWT) en cada escritura, con un cliente `supabase-js` que use `global.headers`. Nunca `set_config` desde la API: cada petición de `supabase-js` es una transacción distinta y el valor se perdería.
- **Errores**, traducidos por SQLSTATE (y, cuando aplica, por nombre de restricción):

  | SQLSTATE | Significa | HTTP sugerido | Mensaje sugerido |
  | --- | --- | --- | --- |
  | `23505` | Duplicado (violación de `UNIQUE`) | `409` | "Ya existe un registro con ese valor" (o el mensaje específico de la restricción) |
  | `23503` al insertar/actualizar | La fila referenciada no existe | `404` | "El recurso referenciado no existe" |
  | `23503` al borrar | Tiene registros asociados (`ON DELETE RESTRICT`) | `409` | "No se puede eliminar: tiene registros asociados" |
  | `23001` al borrar | Bloqueado explícitamente (`impedir_eliminacion`, p. ej. órdenes y auditoría) | `409` | "Este registro no se elimina; usa la operación correspondiente (p. ej. cancelar)" |
  | `23514` de formato | Viola un `CHECK` de formato/enumeración | `400` | El mensaje del CHECK, traducido al campo |
  | `23514` de regla de negocio | Viola un `CHECK` de coherencia (p. ej. crédito↔cliente, motivo↔cancelada) | `409` | El mensaje del CHECK, traducido a la regla |
  | `42501` | Permisos de rol de Postgres mal configurados | `500` | "Error interno de configuración" (nunca se expone el detalle al cliente) |

  **Nota PostgreSQL 18**: al borrar una fila con hijos por `RESTRICT`, PostgreSQL 17 (la versión del proyecto) devuelve `23503`; desde la versión 18 ese mismo caso devuelve `23001`. El mapeo de errores de la API debe tratar ambos códigos igual al borrar, para no romper si el proyecto se actualiza más adelante.
- **`parametros_negocio`** (Fase 2) siempre tiene su fila (`id = 1`, la crea la propia migración 12): `GET /api/parametros` nunca debería dar 404.

## Privilegios EXECUTE de funciones

`CREATE FUNCTION` concede `EXECUTE` a `PUBLIC` por defecto. Eso significa que **revocar `EXECUTE` de `anon`/`authenticated` sin revocarlo también de `PUBLIC` no restringe nada**: cualquier rol hereda el privilegio de `PUBLIC` sin necesitar un grant propio, así que esos roles conservan acceso aunque el `revoke` los nombre explícitamente. Pasó justo esto con `reemplazar_tarifas_servicio()` (PR #12, SCRUM-152): su `revoke execute ... from anon, authenticated;` nunca tocó `PUBLIC`, y `anon`/`authenticated` seguían pudiendo ejecutarla — corregido en `20261030120000_corregir_privilegios_execute_funciones.sql`.

**Patrón correcto para cualquier función nueva** (el que ya usa `registrar_auditoria()` desde `activar_auditoria.sql`, y el que deben seguir todas las funciones nuevas):

```sql
revoke execute on function public.mi_funcion(...) from public, anon, authenticated;
grant execute on function public.mi_funcion(...) to service_role; -- solo si es una RPC que la API invoca
```

`public` es el que realmente importa revocar; `anon`/`authenticated` se listan también por claridad, no porque aporten una restricción adicional una vez que `public` ya no la tiene.

**Funciones de trigger** (`RETURNS trigger`) son un caso aparte: Postgres ya impide llamarlas fuera de un trigger sin importar su `EXECUTE` (`ERROR: trigger functions can only be called as triggers`), y revocarles `EXECUTE` no afecta que sigan disparándose para cualquier rol (el motor de triggers las invoca directamente, sin pasar por esa verificación). Aun así, se revocan de `public`/`anon`/`authenticated` por consistencia y como defensa en profundidad — no por necesidad funcional.

Para auditar el estado real de un esquema completo: `has_function_privilege(rol, funcion, 'execute')` por rol, y `select (aclexplode(proacl)).* from pg_proc where oid = 'public.mi_funcion(...)'::regprocedure` para ver el ACL crudo (incluye la fila de `PUBLIC`, con `grantee` vacío/`0`). `supabase/tests/privilegios_execute_test.sql` corre esta auditoría como regresión estructural en cada `supabase test db`.

## Recetas de corrección

1. **Error en una migración que aún no está en `develop`**: corrige el archivo de la migración y corre `npx supabase db reset`.
2. **Error en una migración ya integrada o aplicada**: crea una migración nueva (`npx supabase migration new corregir_<objeto>`). Nunca se edita la migración original.
3. **Cambiar una regla o agregar un valor a una enumeración**: en una sola sentencia, `alter table <tabla> drop constraint <nombre>, add constraint <nombre> check (...);`. Funciona porque todos los nombres de restricción son explícitos. Luego se actualiza `packages/contratos/dominio.json` en un PR de contratos, junto con la prueba correspondiente.
4. **Corregir un trigger**: migración nueva con `create or replace function`. Las tablas no se tocan — es justo para esto que el comportamiento (triggers) vive separado de la estructura (tablas) en migraciones distintas.
5. **Remoto desordenado mientras sea de desarrollo, sin datos reales**: lo evalúa y ejecuta Diego Cubillos directamente contra el proyecto real, no desde este repositorio.
6. **Local y remoto desincronizados** (`migration list`, `db pull`, `migration repair`): lo revisa Diego Cubillos cuando aplique.
7. **Antes de cualquier cambio en un remoto con datos reales**: Diego respalda con `db dump --linked --data-only` antes de aplicar nada. Los respaldos (`respaldo_*.sql`) nunca se versionan (están en `.gitignore`).
8. **Un dato operativo mal registrado**: las órdenes no se borran, se cancelan con motivo (`motivo` es obligatorio al cancelar). Toda corrección de datos pasa por la API, nunca por SQL directo, para que quede en la auditoría (Fase 2).
