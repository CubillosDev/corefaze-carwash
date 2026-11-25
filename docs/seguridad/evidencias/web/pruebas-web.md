# Pruebas de seguridad del panel web (Playwright)

Fecha: 2026-11-23. Web compilada con `npm run build`, servida con las cabeceras de `apps/web/vercel.json` y conectada a la API local. Navegador: Chrome con Playwright.

| ID | Prueba | Esperado | Obtenido | Estado | Captura |
|---|---|---|---|---|---|
| WEB-01 | Entrar a una ruta protegida sin sesión | redirige a /ingreso | /ingreso | APROBADA | WEB-01_ruta_protegida_sin_sesion.png (en el informe PDF) |
| WEB-02 | Login correcto tras intentar /ordenes-lavado | entra al panel y vuelve a la ruta pedida | /ordenes-lavado | APROBADA | WEB-02_login_correcto.png (en el informe PDF) |
| WEB-03 | El token se guarda solo en sessionStorage | sessionStorage sí; localStorage y cookies vacíos | sessionStorage: sí; localStorage: 0; cookies: 0 | APROBADA | — |
| WEB-04 | XSS almacenado: orden 2872 con &lt;img src=x onerror=alert(1)> en observaciones | se muestra como texto, sin alert ni &lt;img> | texto literal: sí; &lt;img> inyectadas: 0; diálogos: 0 | APROBADA | WEB-04_xss_como_texto.png (en el informe PDF) |
| WEB-05 | JWT vencido en el respaldo de la pestaña | lo descarta en el navegador y vuelve a /ingreso | /ingreso; respaldo: borrado | APROBADA | WEB-05_jwt_vencido.png (en el informe PDF) |
| WEB-06 | JWT rechazado por la API (401) durante la sesión | cierre controlado: /ingreso, aviso "Tu sesión expiró" y respaldo borrado | /ingreso; aviso: sí; respaldo: borrado | APROBADA | WEB-06_sesion_expirada_401.png (en el informe PDF) |
| WEB-07 | Cerrar sesión y volver atrás | borra el respaldo y no deja volver al panel | respaldo: borrado; tras volver atrás: /ingreso | APROBADA | — |
| WEB-08 | Cuenta pendiente entra y luego intenta /usuarios | solo ve la pantalla de espera | pantalla de espera: sí; en /usuarios sigue la espera: sí | APROBADA | WEB-08_cuenta_pendiente.png (en el informe PDF) |
| WEB-09 | Cabeceras de seguridad de vercel.json | CSP sin unsafe-inline en scripts, frame-ancestors 'none', X-Frame-Options DENY, nosniff | CSP: sí; X-Frame-Options: DENY; nosniff: nosniff | APROBADA | — |

Resumen: 9 de 9 aprobadas.
