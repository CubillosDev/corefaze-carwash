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

| Variable          | Descripción                                                           |
| ----------------- | --------------------------------------------------------------------- |
| `NODE_ENV`        | `development`, `test` o `production` (por defecto `development`)      |
| `PORT`            | Puerto donde escucha la API (por defecto `3000`)                      |
| `ALLOWED_ORIGIN`  | Origen permitido por CORS (el panel web, ej. `http://localhost:5173`) |
| `API_KEY_POSTMAN` | Llave del cliente "Postman / Laboratorio"                             |
| `API_KEY_ADMIN`   | Llave del cliente "Panel administrativo (web)"                        |
| `API_KEY_MOVIL`   | Llave del cliente "Aplicación móvil"                                  |

### Generar una API Key local

Cada una de las tres `API_KEY_*` debe ser un valor aleatorio y único. Genera cada una por separado:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Ejecuta el comando tres veces (una por cada variable) y pega cada resultado en su línea correspondiente de `.env`. La API se niega a arrancar si alguna de las tres falta, es demasiado corta, o conserva el valor de ejemplo de `.env.example`.

## Ejecutar

```bash
npm run dev
```

Arranca el servidor con recarga automática y carga las variables de `.env` (usa `--env-file`, nativo de Node).

> **Importante:** `npm start` **no** carga `.env` automáticamente. Está pensado para producción, donde las variables las inyecta el entorno de despliegue directamente, no un archivo. Para desarrollo local, usa siempre `npm run dev`.

Con el servidor corriendo:

- `GET /api/salud` — ruta pública, no requiere autenticación.
- El resto de `/api/*` requiere el header `X-API-Key` con una de las tres llaves configuradas.
- Documentación interactiva (Swagger UI): `http://localhost:3000/api-docs`.

## Autenticación

Cada cliente (Postman, panel web, app móvil) tiene su propia API Key. La API nunca almacena las llaves en texto plano, solo su hash SHA-256, y las compara en tiempo constante para prevenir ataques de temporización.

| Situación                     | Respuesta                       |
| ----------------------------- | ------------------------------- |
| Sin header `X-API-Key`        | `401` — `API Key requerida`     |
| Llave que no existe           | `401` — `API Key inválida`      |
| Llave válida pero desactivada | `403` — `API Key deshabilitada` |
| Llave válida y activa         | Continúa a la ruta solicitada   |

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
├── data/ # Datos en memoria (temporal, hasta Supabase — Bloque 10)
├── docs/ # Configuración de Swagger/OpenAPI
├── middlewares/ # Autenticación, validación, manejo de errores
├── routes/ # Definición de endpoints
├── services/ # Reglas de negocio
└── utils/ # Utilidades compartidas (errores HTTP, criptografía, mapeo de campos)

tests/
├── integration/ # Pruebas de la aplicación completa (Supertest)
└── unit/ # Pruebas por archivo, organizadas igual que src/

## Pendiente

- Persistencia con Supabase/PostgreSQL (Bloque 10) — actualmente los datos viven en memoria.
- Especificación completa de Swagger/OpenAPI para todos los recursos (`/api-docs`, `/openapi.json`); por ahora solo documenta Salud y Seguridad.
- Pipeline de CI (`api.yml`) para automatizar lint, formato y pruebas en cada Pull Request.
- Recursos de negocio pendientes: colaboradores, servicios, clientes, vehículos, órdenes de lavado.
