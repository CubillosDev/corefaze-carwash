# Trazabilidad: tiempos de ejecución de la API

Generado con `npm run trazabilidad --workspace apps/api` el 2026-11-19 · Node v22.19.0 · 12th Gen Intel(R) Core(TM) i5-12500H · win32.

Mide las funciones de seguridad y la cadena completa de middlewares de la app real (helmet, CORS, trazabilidad, API Key, JWT, validación), sin base de datos. Los tiempos con base de datos se ven en vivo en `GET /api/trazabilidad` (solo superadmin).

## Funciones y peticiones

| Servicio | Operación | Iteraciones | Promedio (ms) | Mediana (ms) | p95 (ms) | Mínimo (ms) | Máximo (ms) | Ops/s |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Seguridad | SHA-256 de una API Key | 5000 | 0.005 | 0.003 | 0.01 | 0.001 | 1.004 | 197613 |
| Seguridad | Buscar el cliente de una API Key (4 llaves, tiempo constante) | 5000 | 0.01 | 0.006 | 0.019 | 0.002 | 8.563 | 101428 |
| Seguridad | Firmar un JWT (HS256) | 2000 | 1.225 | 1.163 | 2.205 | 0.526 | 16.453 | 816 |
| Seguridad | Verificar un JWT | 2000 | 0.669 | 0.591 | 1.022 | 0.538 | 4.321 | 1495 |
| Seguridad | Hash de contraseña con bcrypt (12 rondas) | 10 | 417.954 | 409.268 | 447.844 | 387.44 | 447.844 | 2 |
| Seguridad | Verificar contraseña con bcrypt (12 rondas) | 10 | 414.992 | 409.615 | 454.287 | 370.134 | 454.287 | 2 |
| Datos | Mapear 100 filas de snake_case a camelCase | 2000 | 0.441 | 0.362 | 0.748 | 0.303 | 7.599 | 2265 |
| Datos | Fechas de un rango de 31 días (reportes) | 5000 | 0.074 | 0.058 | 0.111 | 0.053 | 2.137 | 13437 |
| HTTP | GET /api/salud (pública) | 300 | 1.697 | 1.503 | 3.214 | 0.958 | 6.099 | 589 |
| HTTP | GET /api/clientes sin API Key → 401 | 300 | 1.664 | 1.383 | 2.791 | 0.981 | 7.036 | 601 |
| HTTP | GET /api/clientes sin JWT → 401 | 300 | 1.588 | 1.46 | 2.365 | 0.931 | 6.077 | 630 |
| HTTP | POST /api/auth/login con datos inválidos → 400 | 300 | 2.485 | 2.135 | 4.231 | 1.428 | 14.43 | 402 |
| HTTP | GET /api/no-existe → 404 | 300 | 1.385 | 1.137 | 2.516 | 0.888 | 15.074 | 722 |

## Lo que registró el middleware de trazabilidad

Cada petición HTTP de arriba pasó por el middleware, que la guarda por patrón de ruta (nunca la URL real) y responde con `X-Request-Id` y `X-Response-Time`.

| Ruta | Peticiones | Promedio (ms) | Mediana (ms) | p95 (ms) | 4xx | 5xx |
| --- | --- | --- | --- | --- | --- | --- |
| POST /api/auth/login | 305 | 1.21 | 0.93 | 1.91 | 305 | 0 |
| GET /api/clientes | 305 | 0.56 | 0.44 | 0.89 | 305 | 0 |
| GET /api/clientes (sin ruta) | 305 | 0.55 | 0.43 | 0.96 | 305 | 0 |
| GET /api/salud | 305 | 0.51 | 0.41 | 0.72 | 0 | 0 |
| GET /api/no-existe (sin ruta) | 305 | 0.47 | 0.37 | 0.82 | 305 | 0 |

## Lectura

- **bcrypt es lo más lento a propósito**: 12 rondas encarecen cada intento de adivinar una contraseña. Es el costo que paga el login, no un problema de rendimiento.
- Verificar la API Key y el JWT cuesta microsegundos: la seguridad de cada petición casi no agrega tiempo.
- Las peticiones rechazadas (401, 400, 404) responden sin tocar la base: un ataque de fuerza bruta no la carga.
