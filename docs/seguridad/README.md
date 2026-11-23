# Pruebas de seguridad de Corefaze CarWash

Pruebas de la electiva **Seguridad en el Desarrollo de Software** (Universidad Santo Tomás, Seccional Tunja, 2026-2), adaptadas de las guías del curso a este proyecto. Las guías usan como ejemplo la "API Hospital", con pacientes, médicos y citas. Aquí se aplican a los roles y recursos de Corefaze: superadmin, administrador, soporte y pendiente; órdenes de lavado, clientes, nómina y reportes.

Ejecución: 23 de noviembre de 2026, en local: API en `:3100`, Supabase local y web compilada.

## Resultado general

| Técnica | Herramienta | Resultado |
|---|---|---|
| SCA: dependencias | `npm audit` | Web y landing: 0. API en producción: 3 moderadas (`glob` y `minimatch`, a través de `swagger-jsdoc`) |
| SAST: código fuente | Semgrep, 8 conjuntos de reglas (OWASP Top 10, JWT, XSS, secretos…) | 0 hallazgos (110 reglas, 468 archivos) |
| DAST: aplicación en ejecución | OWASP ZAP 2.x (baseline y API scan) | 0 fallos. Avisos de configuración: cabeceras, DOMPurify dentro de Swagger UI |
| Pruebas de API | Script propio, `fetch` + JWT | 58 pruebas: 53 aprobadas, 1 parcial, 2 no implementadas, 2 fallidas |
| Bootstrap y persistencia | `seed:superadmin` y reinicio de la API | BA01–BA09 y P36: 10 de 10 aprobadas |
| Pruebas del navegador | Playwright con Chrome | 9 de 9 aprobadas |
| Base de datos | Consultas de solo lectura (RLS, privilegios, BYPASSRLS) | RLS en 23 de 23 tablas. `anon` sin privilegios. `service_role` con BYPASSRLS (ver hallazgo H-08) |
| Calidad | `npm run lint` y `npm run build` | Web y API sin errores |

## Documentos

- [informe-pruebas-seguridad.md](informe-pruebas-seguridad.md): informe completo con metodología, resultados, hallazgos, remediación y conclusión sobre RLS frente a Express.
- [matriz-guias.md](matriz-guias.md): qué pide cada guía del curso y con qué prueba de Corefaze se cubrió.
- [evidencias/](evidencias/): salidas originales de las herramientas.

| Carpeta | Contenido |
|---|---|
| `evidencias/sca/` | `npm audit` completo y solo de producción, para web, API y landing |
| `evidencias/sast/` | `semgrep.json` y salida de consola |
| `evidencias/dast/` | Reportes ZAP (HTML y JSON) de la web, la API y la página de Swagger, más [resumen-dast.md](evidencias/dast/resumen-dast.md) |
| `evidencias/api/` | `pruebas-api.md` y `.json` (58 pruebas), `bootstrap-superadmin.md` (BA01–BA09 y P36) y `swagger.md` |
| `evidencias/web/` | `pruebas-web.md` y `.json`. Las capturas van en el informe PDF, no en el repositorio |
| `evidencias/bd/` | `verificacion-bd.md`: RLS, políticas, roles, privilegios y auditoría |
| `evidencias/calidad/` | Lint y build de la web |

## Cómo repetir las pruebas

Requisitos: Docker con Supabase local (`npx supabase start`), la API en `http://localhost:3100` y las credenciales de demostración. Las llaves y contraseñas se pasan por variables de entorno; **nunca** se escriben en el repositorio.

```bash
# 1. SCA
npm audit --workspace apps/api --omit=dev

# 2. SAST
semgrep --config p/javascript --config p/react --config p/nodejs --config p/secrets \
  --config p/owasp-top-ten --config p/expressjs --config p/jwt --config p/xss \
  apps/api/src apps/web/src apps/landing/src

# 3. Pruebas de la API (escribe evidencias/api/pruebas-api.*)
PRUEBAS_API_KEY=... PRUEBAS_JWT_SECRET=... PRUEBAS_SUPABASE_URL=http://127.0.0.1:54321 \
PRUEBAS_SUPABASE_ANON_KEY=... PRUEBAS_CLAVE_SUPERADMIN=... PRUEBAS_CLAVE_ADMINISTRADOR=... \
PRUEBAS_CLAVE_SOPORTE=... PRUEBAS_CLAVE_PENDIENTE=... PRUEBAS_CLAVE_DESHABILITADO=... \
node apps/api/scripts/pruebas-seguridad.js

# 4. Pruebas del navegador (web compilada servida en :5173)
npm run build:web
PRUEBAS_JWT_SECRET=... PRUEBAS_CLAVE_SUPERADMIN=... PRUEBAS_CLAVE_PENDIENTE=... \
PLAYWRIGHT_CANAL=chrome node apps/web/scripts/pruebas-seguridad-web.mjs

# 5. DAST
docker run --rm -v "$PWD/docs/seguridad/evidencias/dast:/zap/wrk" zaproxy/zap-stable \
  zap-baseline.py -t http://host.docker.internal:5173/ -r zap-web.html -J zap-web.json
docker run --rm -v "$PWD/docs/seguridad/evidencias/dast:/zap/wrk" zaproxy/zap-stable \
  zap-api-scan.py -t /zap/wrk/openapi-zap.json -f openapi -r zap-api.html -J zap-api.json
```

Las pruebas de la API crean órdenes de prueba marcadas con `[PRUEBA-SEG]` y al final las anulan. Las pruebas BA08 y BA09 modifican roles; por eso solo se corren en la base aislada de pruebas (`corefaze-pruebas`, puerto 55321) y al terminar se restauran los superadmins originales.
