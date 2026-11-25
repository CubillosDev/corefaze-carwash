# Resumen DAST (OWASP ZAP)

Imagen `zaproxy/zap-stable`, 23 de noviembre de 2026. ZAP corre en Docker y llega a la máquina por `host.docker.internal`.

| Objetivo | Tipo de escaneo | URLs recorridas | Fallos | Avisos | Reglas aprobadas | Reporte |
|---|---|---|---|---|---|---|
| Web (`:5173`), compilada y servida con las cabeceras de `apps/web/vercel.json` | Baseline (pasivo, araña de 2 minutos) | 9 | 0 | 5 | 63 | `zap-web.html` |
| API (`:3100`), 54 rutas de OpenAPI (74 URLs importadas) | API scan (activo), sin credenciales | 200 | 0 | 0 | 120 | `zap-api.html` |
| Swagger UI (`/api-docs/`) | Baseline (pasivo) | 12 | 0 | 7 | 61 | `zap-swagger.html` |

El API scan se hizo **sin credenciales** a propósito: el escaneo activo envía cargas de ataque, como inyección SQL, XSS, path traversal y desbordamientos, y con credenciales válidas podría escribir en la base de demostración. Sin credenciales, todas las cargas chocan con la API Key y el JWT, y ninguna produjo un error 500, una traza ni una fuga de datos.

## Avisos y valoración

| Regla ZAP | Dónde | Valoración |
|---|---|---|
| 10003 Vulnerable JS Library (DOMPurify 3.4.16) | `swagger-ui-bundle.js` en `/api-docs` | **Real, baja.** La librería vulnerable viene dentro de `swagger-ui-express`. Solo afecta la página de documentación, que no muestra datos de usuarios. Ver hallazgo H-05 |
| 10055 CSP: `style-src 'unsafe-inline'` | Web y Swagger | Baja. La necesitan los estilos en línea de React y Swagger UI. `script-src` no tiene `unsafe-inline`, así que XSS sigue bloqueado |
| 10055 CSP: comodín `https:` en `style-src` y `font-src` | Swagger (CSP de helmet por defecto) | Baja. Conviene restringir a `'self'` |
| 10055 CSP: falta una directiva sin respaldo | Redirección `/api-docs` → `/api-docs/` (`default-src 'none'`) | Informativa. La respuesta es una redirección sin contenido |
| 10063 Permissions-Policy ausente | API y Swagger | Baja. La web sí la envía, desde `vercel.json` |
| 90004 Cross-Origin-Embedder-Policy ausente | Web y Swagger | Baja. Solo importa si se usa aislamiento entre orígenes |
| 10049 Contenido almacenable en caché | Web y Swagger | Informativa. Es lo esperado en archivos estáticos con hash |
| 10027 Comentarios sospechosos | Bundle de la web | Falso positivo. Son comentarios de librerías dentro del bundle minificado |
| 10096 Marca de tiempo Unix | Swagger | Falso positivo. Son números dentro del bundle de Swagger UI |
| 10109 Aplicación web moderna | Web y Swagger | Informativa. ZAP avisa que la aplicación usa JavaScript para navegar |

`openapi-zap.json` es la especificación que se le entregó a ZAP: la misma de `/api-docs`, con el servidor apuntando a `host.docker.internal:3100`. `zap.yaml` es el archivo de configuración que genera ZAP.
