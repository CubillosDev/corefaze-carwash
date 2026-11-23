# Informe de pruebas de seguridad: Corefaze CarWash

**Asignatura:** Electiva Seguridad en el Desarrollo de Software. Universidad Santo Tomás, Seccional Tunja.
**Docente:** Sergio Arley Puerto Moreno.
**Integrantes:** Diego Armando Cubillos Clavijo, Cristian David Olarte Moreno, Diego Alejandro Urbano Pira.
**Fecha:** 23 de noviembre de 2026.

> La versión en PDF, con formato APA 7, portada, capturas y referencias, se entrega aparte. Este archivo es la versión técnica que vive con el código.

## 1. Alcance

| Componente | Tecnología | Qué se probó |
|---|---|---|
| API (`apps/api`) | Node.js 22, Express 5, supabase-js, JWT HS256, bcrypt (12 rondas), helmet, express-validator | Autenticación, JWT, API Key, RBAC y BOLA, validación, reglas de negocio, cabeceras, CORS, límites y bootstrap |
| Panel web (`apps/web`) | React 19 y Vite. Se publica en Vercel con CSP | Manejo de la sesión, rutas protegidas, XSS, cabeceras |
| Base de datos (`supabase/`) | PostgreSQL 17 (Supabase) con RLS y 24 migraciones | RLS, políticas, privilegios de `anon` y `authenticated`, BYPASSRLS, auditoría |
| Landing (`apps/landing`) | React y Vite | Dependencias y SAST |

Entorno: todo local. API en `:3100`, Supabase local en `:54321`, base aislada en `:55321` y web compilada en `:5173`. **No se atacó ningún entorno publicado.**

## 2. Metodología

Las pruebas siguen la estrategia del curso, que combina cuatro técnicas complementarias:

1. **SCA** (análisis de composición): `npm audit` sobre cada aplicación, completo y solo de producción (`--omit=dev`).
2. **SAST** (análisis estático): Semgrep con los conjuntos `p/javascript`, `p/react`, `p/nodejs`, `p/secrets`, `p/owasp-top-ten`, `p/expressjs`, `p/jwt` y `p/xss`.
3. **DAST** (análisis dinámico): OWASP ZAP. Escaneo base de la web y de Swagger, y escaneo de API guiado por OpenAPI.
4. **Pruebas funcionales de seguridad**, derivadas de las guías del curso: Bloque 8 (P01–P36, SEG-01..08, BA01..09), README 11 (Paso 8, Verificaciones y Paso 10) y la guía de cierre (§8). Se automatizaron en dos scripts:
   - `apps/api/scripts/pruebas-seguridad.js`: 58 pruebas HTTP contra la API y PostgREST.
   - `apps/web/scripts/pruebas-seguridad-web.mjs`: 9 pruebas en Chrome con Playwright.

Cada caso registra el identificador de la guía de origen, el esperado, lo obtenido y el estado. La correspondencia completa está en [matriz-guias.md](matriz-guias.md).

## 3. Resultados

### 3.1 SCA: dependencias

| Aplicación | Todas las dependencias | Solo producción |
|---|---|---|
| Web | 0 | 0 |
| Landing | 0 | 0 |
| API | 19 moderadas (todas son `glob` y `minimatch`, en su mayoría a través de Jest) | 3 moderadas: `glob` (GHSA-3g3m-2fjr-6pw4) y `minimatch` (GHSA-g3hv-75wg-m249), las dos a través de `swagger-jsdoc` |

No hay vulnerabilidades altas ni críticas. Las 3 de producción solo se ejecutan cuando la API arranca y lee sus propios archivos de rutas, con patrones fijos. Ningún usuario puede enviarles datos. Ver H-06.

### 3.2 SAST: Semgrep

110 reglas sobre 468 archivos de `apps/api/src`, `apps/web/src` y `apps/landing/src`: **0 hallazgos**. Esto confirma que no hay secretos en el código, ni `eval`, ni `dangerouslySetInnerHTML`, ni JWT sin verificar, ni consultas SQL armadas con texto, ni redirecciones abiertas.

### 3.3 DAST: OWASP ZAP

| Objetivo | Fallos | Avisos | Reglas aprobadas |
|---|---|---|---|
| Web (escaneo base) | 0 | 5 | 63 |
| API (escaneo activo, 74 URLs) | 0 | 0 | 120 |
| Swagger UI (escaneo base) | 0 | 7 | 61 |

Los avisos son de configuración y se valoran en [evidencias/dast/resumen-dast.md](evidencias/dast/resumen-dast.md). El único que corresponde a un componente vulnerable es DOMPurify 3.4.16, dentro de Swagger UI (H-05).

### 3.4 Pruebas de la API (58)

| Categoría | Pruebas | Aprobadas | Otras |
|---|---|---|---|
| Autenticación | 8 | 8 | — |
| JWT | 8 | 5 | JWT-06 parcial; JWT-07 y JWT-08 no implementadas |
| API Key | 5 | 4 | KEY-05 fallida |
| RBAC, BOLA y escalada de privilegios | 11 | 11 | — |
| Validación e inyección | 6 | 6 | — |
| Reglas de negocio | 11 | 11 | — |
| XSS | 1 | 1 | — |
| CORS, cabeceras y CSRF | 5 | 5 | — |
| Fuerza bruta | 1 | 0 | LIM-01 fallida |
| RLS (acceso directo con `anon`) | 2 | 2 | — |
| **Total** | **58** | **53** | 1 parcial, 2 no implementadas, 2 fallidas |

Lo más importante:

- Un JWT con el rol alterado, con `alg: none`, firmado con otro secreto o vencido recibe 401.
- Al desactivar una cuenta, su token deja de servir en la siguiente petición (JWT-05), porque el usuario se recarga en cada solicitud.
- Ningún rol puede subirse de privilegio: el registro con `rol: superadmin` crea una cuenta `pendiente`, y soporte o administrador que intentan cambiar un rol reciben 403.
- El servidor calcula el valor de la orden e ignora el valor y el estado que envía el cliente (asignación masiva, NEG-01).
- La inyección SQL y la de filtros de PostgREST se tratan como texto literal.
- La llave `anon` no puede leer tablas por PostgREST (42501).

Detalle completo en [evidencias/api/pruebas-api.md](evidencias/api/pruebas-api.md).

### 3.5 Bootstrap del superadmin y persistencia (BA01–BA09, P36)

10 de 10 aprobadas. El script `seed:superadmin`:

- es idempotente: no crea ni modifica nada si ya existe un superadmin;
- falla de forma controlada, con código de salida 1, si faltan las variables;
- en una base sin superadmin crea exactamente uno;
- **se niega a elevar** una cuenta existente, por ejemplo una de soporte (BA09).

La API arranca sin las variables `SUPERADMIN_*`. Los datos se conservan al reiniciar la API (P36). Ver [evidencias/api/bootstrap-superadmin.md](evidencias/api/bootstrap-superadmin.md).

### 3.6 Pruebas del navegador (9)

9 de 9 aprobadas:

- Las rutas protegidas sin sesión llevan a `/ingreso`.
- El token vive solo en `sessionStorage`: `localStorage` y las cookies quedan vacíos.
- La carga `<img src=x onerror=alert(1)>` guardada en una orden se muestra como texto.
- Un JWT vencido se descarta en el navegador.
- Un 401 de la API cierra la sesión con el aviso "Tu sesión expiró".
- Cerrar sesión borra el respaldo, y "Atrás" no devuelve al panel.
- Una cuenta pendiente solo ve la pantalla de espera.
- La CSP no permite `unsafe-inline` en scripts, y la web envía `frame-ancestors 'none'`, `X-Frame-Options: DENY` y `nosniff`.

Ver [evidencias/web/pruebas-web.md](evidencias/web/pruebas-web.md).

### 3.7 Base de datos

- RLS está habilitado en las 23 tablas de `public`, con 44 políticas.
- Ninguna política `USING (true)` aplica a `anon`.
- `anon` no tiene privilegios sobre tablas ni puede ejecutar funciones.
- `authenticated` tiene privilegios sobre 21 tablas, siempre filtrados por las políticas.
- `postgres` y `service_role` tienen BYPASSRLS.
- Todas las tablas de negocio tienen un disparador de auditoría, y `ordenes_lavado` además impide el borrado físico.

Ver [evidencias/bd/verificacion-bd.md](evidencias/bd/verificacion-bd.md).

## 4. Hallazgos

Severidad según el impacto y la facilidad de explotación en el contexto de Corefaze: un panel interno de un lavadero, con pocos usuarios y sin pagos en línea.

| ID | Hallazgo | Severidad | OWASP | Evidencia |
|---|---|---|---|---|
| H-01 | Sin límite de intentos en `/auth/login` y `/auth/registro` | **Media** | A07:2021, API4:2023 | LIM-01 |
| H-02 | Cerrar sesión no revoca el JWT en el servidor | **Media** | A07:2021 | JWT-06 |
| H-03 | No hay cambio de contraseña ni recuperación de cuenta | Baja (funcional) | A07:2021 | JWT-07, JWT-08 |
| H-04 | El login exige la API Key, que en la web es pública | Baja | API2:2023 | KEY-05 |
| H-05 | DOMPurify vulnerable dentro de Swagger UI | Baja | A06:2021 | ZAP 10003 |
| H-06 | 3 dependencias de producción moderadas (`glob` y `minimatch`) | Baja | A06:2021 | npm audit |
| H-07 | Faltan Permissions-Policy y COEP en la API; CSP con `unsafe-inline` en estilos | Baja | A05:2021 | ZAP 10055, 10063, 90004 |
| H-08 | La API usa `service_role` (BYPASSRLS): RLS no la limita | Informativa (riesgo de diseño) | A01:2021 | Verificación 07c |

### Remediación propuesta

- **H-01.** Agregar `express-rate-limit` a `/api/auth/login` y `/api/auth/registro`: por ejemplo, 5 intentos por minuto por IP y por correo, con respuesta 429 y `Retry-After`. Registrar en auditoría los bloqueos.
- **H-02.** Agregar la columna `version_sesion` en `usuarios`, incluirla en el JWT y compararla en `autenticarJWT`, que ya recarga al usuario en cada petición, así que el costo es nulo. Crear `POST /api/auth/cierre`, que la incremente. Mientras tanto, la mitigación vigente es un `JWT_EXPIRES_IN` corto y la desactivación inmediata (JWT-05).
- **H-03.** Implementar `PATCH /api/auth/contrasena` (pide la contraseña actual e incrementa `version_sesion`) y la recuperación administrativa. El token aleatorio se guarda como SHA-256, vence en 15 minutos y sirve una sola vez. Los códigos de respaldo se guardan con bcrypt. Es lo que describe el README 11.
- **H-04.** Dejar `/auth/login` y `/auth/registro` fuera de la API Key y protegerlos con el límite de H-01. La API Key de la web va dentro del bundle, así que identifica al cliente, pero no es un secreto.
- **H-05.** Actualizar `swagger-ui-express` o `swagger-ui-dist` a una versión con DOMPurify corregido. Publicar `/api-docs` solo fuera de producción o detrás de autenticación.
- **H-06.** Actualizar `swagger-jsdoc`, o generar `openapi.json` al compilar y dejar de cargar `swagger-jsdoc` en producción.
- **H-07.** Agregar `permissionsPolicy` y `crossOriginEmbedderPolicy` en la configuración de helmet de la API. Cambiar `style-src` a `'self'` en Swagger donde sea posible.
- **H-08.** Es la diferencia central que plantea el curso (ver §5). Mientras la API use `service_role`, la autorización depende por completo de Express: API Key, JWT, RBAC y validación, y las pruebas muestran que ese control funciona. Para producción conviene:
  1. mantener la llave `service_role` solo en el servidor (hoy lo está);
  2. evaluar un rol de PostgreSQL con privilegios mínimos, sin BYPASSRLS, para las operaciones que no lo necesitan;
  3. o pasar el JWT del usuario a PostgREST, para que las políticas RLS también apliquen a la API.

## 5. Discusión: RLS frente a los controles de Express

RLS (Row Level Security) es una defensa **de la base de datos**: PostgreSQL filtra filas según el rol con que llega cada consulta. Express es una defensa **de la aplicación**: decide quién puede llamar a qué endpoint y con qué datos.

En Corefaze, RLS está habilitado en todas las tablas y bloquea por completo a `anon`. Si alguien obtiene la URL de Supabase y la llave pública, no puede leer clientes, usuarios ni hashes (RLS-01, RLS-02). Pero la API se conecta con `service_role`, un rol con **BYPASSRLS**: para las consultas de la API, las políticas no existen. Que RLS esté activo **no** significa que proteja las peticiones que pasan por Express.

Por eso, en este proyecto, los controles efectivos sobre la API son los de Express:

- la API Key, comparada por hash y en tiempo constante;
- el JWT HS256 con usuario recargado;
- el RBAC por rol;
- la validación con express-validator;
- las reglas de negocio en el servicio.

Las 58 pruebas de la API los verifican. RLS queda como segunda línea de defensa ante el acceso directo a la base. Es la misma conclusión del README 11 sobre el usuario `postgres` con BYPASSRLS: hay que resolverlo, o al menos documentarlo, antes de producción.

## 6. Conclusiones

1. Los controles de acceso de la API (autenticación, JWT, RBAC, BOLA y escalada de privilegios) superaron todas las pruebas. No se encontró ninguna forma de leer o modificar datos sin el rol adecuado.
2. Las cuatro técnicas (SCA, SAST, DAST y pruebas manuales automatizadas) se complementan. SAST y ZAP no encontraron fallos. Las pruebas funcionales detectaron los hallazgos de más valor (H-01 y H-02), que ninguna herramienta automática reporta, porque son la ausencia de un control.
3. Las brechas frente a las guías del curso son de **gestión de la sesión**: no hay límite de intentos, ni revocación al cerrar sesión, ni cambio o recuperación de contraseña. Las mitiga en parte el vencimiento del token, la desactivación inmediata y el borrado del `sessionStorage`, y tienen una remediación concreta (§4).
4. RLS protege la base frente al acceso directo, pero no frente a la API, que usa `service_role`. La seguridad efectiva de Corefaze depende de Express, y por eso se probó a fondo.
