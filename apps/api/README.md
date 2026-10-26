# Car Wash API

API REST del sistema Car Wash, construida con Node.js y Express. Gestiona colaboradores, servicios, clientes, vehículos y órdenes de lavado para digitalizar el registro que hoy se lleva en Excel.

## Requisitos

- Node.js >= 20.6.0
- npm

## Instalación

Desde `apps/api`:

```bash
npm install
```

## Configuración

Copia la plantilla de variables de entorno:

```bash
cp .env.example .env
```

Luego reemplaza los valores de ejemplo en `.env`:

| Variable                    | Descripción                                                                               |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| `NODE_ENV`                  | `development`, `test` o `production` (por defecto `development`)                          |
| `PORT`                      | Puerto donde escucha la API (por defecto `3000`)                                          |
| `ALLOWED_ORIGIN`            | Origen permitido por CORS (el panel web, ej. `http://localhost:5173`)                     |
| `API_KEY_POSTMAN`           | Llave del cliente "Postman / Laboratorio"                                                 |
| `API_KEY_ADMIN`             | Llave del cliente "Administración"                                                        |
| `API_KEY_MOVIL`             | Llave del cliente "Aplicación móvil"                                                      |
| `API_KEY_WEB`               | Llave del cliente "Panel web" (`apps/web`, variable `VITE_API_KEY`)                       |
| `SUPABASE_URL`              | URL del proyecto Supabase (no es secreta; en local, la del stack de `npx supabase start`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Llave de servicio de Supabase (SÍ es secreta: bypasea RLS) — ver sección "Base de datos"  |

### Generar una API Key local

Cada una de las cuatro `API_KEY_*` debe ser un valor aleatorio y único. Genera cada una por separado:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Ejecuta el comando cuatro veces (una por cada variable) y pega cada resultado en su línea correspondiente de `.env`. La API se niega a arrancar si alguna de las cuatro falta, es demasiado corta, o conserva el valor de ejemplo de `.env.example`.

### Base de datos (Supabase, SCRUM-152)

El esquema vive versionado en `supabase/` (ver `supabase/README.md`). La API nunca se conecta al proyecto remoto desde el entorno de un desarrollador ni desde los tests — siempre al stack local:

```bash
npx supabase start   # desde la raíz del monorepo; deja Docker corriendo Postgres + PostgREST local
```

La CLI imprime `API_URL` y `SERVICE_ROLE_KEY`: pégalos en `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` de tu `.env`. Los tests (`tests/setupEnv.js`) ya traen fijos la URL (`http://127.0.0.1:54321`) y la service_role key del stack local — es un valor fijo y conocido de cualquier instalación local de la CLI, no un secreto real, así que nunca apuntan al remoto.

El primer `superadmin` ya no se crea al arrancar el servidor: corre, de forma explícita,

```bash
npm run seed:superadmin
```

Es idempotente (si ya existe un `superadmin`, no hace nada) y exige `SUPERADMIN_EMAIL`/`SUPERADMIN_PASSWORD` en el entorno, con las mismas reglas que antes (ver `.env.example`).

## Ejecutar

```bash
npm run dev
```

Arranca el servidor con recarga automática y carga las variables de `.env` (usa `--env-file`, nativo de Node).

> **Importante:** `npm start` **no** carga `.env` automáticamente. Está pensado para producción, donde las variables las inyecta el entorno de despliegue directamente, no un archivo. Para desarrollo local, usa siempre `npm run dev`.

Con el servidor corriendo:

- `GET /api/salud` — ruta pública, no requiere autenticación.
- El resto de `/api/*` requiere el header `X-API-Key` con una de las cuatro llaves configuradas.
- Documentación interactiva (Swagger UI): `http://localhost:3000/api-docs`.

## Autenticación

Cada cliente (Postman, administración, app móvil, panel web) tiene su propia API Key, para poder revocarla (rotando su valor) sin afectar a las demás. La API nunca almacena las llaves en texto plano, solo su hash SHA-256, y las compara en tiempo constante para prevenir ataques de temporización.

| Situación                     | Respuesta                       |
| ----------------------------- | ------------------------------- |
| Sin header `X-API-Key`        | `401` — `API Key requerida`     |
| Llave que no existe           | `401` — `API Key inválida`      |
| Llave válida pero desactivada | `403` — `API Key deshabilitada` |
| Llave válida y activa         | Continúa a la ruta solicitada   |

**La API Key del panel web identifica a la aplicación, no protege los datos — la protección real es JWT + RBAC (ver SCRUM-139).** Cualquier variable `VITE_*` del panel web queda visible en el JavaScript que descarga el navegador, así que `API_KEY_WEB` nunca debe tratarse como un control de acceso por sí sola.

## Pruebas, lint y formato

```bash
npm test              # Ejecuta todas las pruebas (unitarias e integración)
npm run test:cobertura # Ejecuta las pruebas con reporte de cobertura
npm run lint           # Revisa el código con ESLint
npm run format         # Formatea el código con Prettier
npm run format:check   # Verifica el formato sin modificar archivos
```

Antes de cada commit, corre en este orden:

```bash
npm run format && npm run lint && npm test
```

## Estructura de carpetas

src/
├── app.js # Construye la aplicación Express (sin escuchar)
├── server.js # Arranca y detiene el servidor
├── config/ # Carga y valida variables de entorno
├── constants/ # Dominio compartido del monorepo (estados, medios de pago, etc.)
├── controllers/ # Traducen HTTP a llamadas al service
├── data/ # Datos en memoria (temporal, hasta Supabase — SCRUM-152; clientes ya migró)
├── docs/ # Configuración de Swagger/OpenAPI
├── middlewares/ # Autenticación, validación, manejo de errores
├── routes/ # Definición de endpoints
├── services/ # Reglas de negocio
└── utils/ # Utilidades compartidas (errores HTTP, criptografía, mapeo de campos)

tests/
├── integration/ # Pruebas de la aplicación completa (Supertest)
└── unit/ # Pruebas por archivo, organizadas igual que src/

## Dominio y contratos

Cambios de contrato recientes que todo el equipo debe tener en cuenta (sección 10.1 del estándar):

- **Órdenes de lavado**: el campo `valor` se fija una sola vez al crear la orden (según la tarifa del servicio para el tipo de vehículo) y es **inmutable**: editar una orden (`PATCH /api/ordenes-lavado/:id`) nunca lo recalcula, aunque cambie la tarifa del servicio o el vehículo tenga un tipo distinto.
- **Jornadas**: las URLs no llevan verbos (el verbo va en el método HTTP). Se abre con `POST /api/jornadas` (sin body) y se cierra o reabre con un único endpoint, `PATCH /api/jornadas/:id/estado`, enviando `{ "estado": "cerrada" | "abierta" }`. Los antiguos `POST /api/jornadas/abrir`, `PATCH /api/jornadas/:id/cerrar` y `PATCH /api/jornadas/:id/reabrir` ya no existen.
- **Vehículos**: el atributo se llama `tipoVehiculo`, no `tipo`, tanto en el body de `POST`/`PUT /api/vehiculos` como en el objeto que devuelve la API.
- **RBAC (SCRUM-139)**: el registro público (`POST /api/auth/registro`) sigue naciendo siempre `"pendiente"`. La única forma de obtener un rol operativo es `PATCH /api/auth/usuarios/:id/rol`, protegida para `superadmin`. El primer `superadmin` se crea con `npm run seed:superadmin` (ver sección "Base de datos" arriba; antes de SCRUM-152 este bootstrap corría solo con levantar el servidor), solo si `SUPERADMIN_EMAIL`/`SUPERADMIN_PASSWORD` están definidas en el entorno (ver `.env.example`); es idempotente y nunca se ejecuta en los tests. **Todos** los recursos de negocio exigen ahora API Key + JWT + rol autorizado (ver matriz abajo); el mapeo completo de roles está documentado en el [ADR 0003](../../docs/arquitectura/decisiones/0003-mapeo-roles-rbac.md), propuesto y pendiente de aprobación formal del equipo.

  | Recurso             | Lectura (GET)                      | Mutación                                                              | Notas                                                                 |
  | ------------------- | ---------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------- |
  | Clientes            | superadmin, administrador, soporte | superadmin, administrador                                             | —                                                                     |
  | Vehículos           | superadmin, administrador, soporte | superadmin, administrador                                             | —                                                                     |
  | Servicios           | superadmin, administrador, soporte | superadmin, administrador                                             | Tarifas tratadas como "operación", no "configuración" (ver ADR 0003)  |
  | Colaboradores       | superadmin, administrador, soporte | superadmin, administrador                                             | Sin cambios desde el alcance inicial                                  |
  | Órdenes de lavado   | superadmin, administrador, soporte | Registrar/editar: los 3 roles · **Anular: superadmin, administrador** | `soporte` no puede cancelar una orden                                 |
  | Jornadas            | superadmin, administrador, soporte | Abrir/cerrar: los 3 roles · **Reabrir: superadmin únicamente**        | `abiertaPor`/`cerradaPor` quedan con el email del usuario autenticado |
  | Asignación de roles | —                                  | superadmin únicamente                                                 | `PATCH /api/auth/usuarios/:id/rol`                                    |

  Un usuario `pendiente` recibe 403 en cualquier recurso de negocio hasta que un `superadmin` le asigne rol.

## Pendiente

- Persistencia con Supabase/PostgreSQL (SCRUM-152): `clientes` ya migró (Etapa A); vehículos, colaboradores, servicios, órdenes de lavado, jornadas y usuarios/auth siguen en memoria (Etapa B).
- Pipeline de CI (`api.yml`) para automatizar lint, formato y pruebas en cada Pull Request.
- Aprobación formal del equipo sobre el mapeo de roles del [ADR 0003](../../docs/arquitectura/decisiones/0003-mapeo-roles-rbac.md) (criterio de aceptación de SCRUM-139 que depende de una decisión humana, no de código).
- Recurso `/api/usuarios` (SCRUM-141): consolidará la gestión de usuarios; deberá decidir si `PATCH /api/auth/usuarios/:id/rol` se fusiona con él o convive deliberadamente.
