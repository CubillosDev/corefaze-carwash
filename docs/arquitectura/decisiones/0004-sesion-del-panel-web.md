# 0004 · Dónde vive la sesión del panel web

- **Estado:** aceptada — versión 2 (reemplaza la versión 1)
- **Tarea:** SCRUM-148
- **Fecha:** 2026-11-18 (versión 2) · 2026-10-21 (versión 1)

## Contexto

`POST /api/auth/login` devuelve `{ usuario, token }` con un JWT (HS256, 1 h por defecto según
`JWT_EXPIRES_IN` en `apps/api/src/config/env.js`). El panel envía ese token en
`Authorization: Bearer <token>` y debe decidir dónde guardarlo.

Con la versión 1 (solo en memoria) la sesión se perdía al recargar la página (F5). En la recepción
del lavadero eso obliga a ingresar de nuevo varias veces por jornada. Por eso se cambia la decisión
y se alinea con el patrón del curso: JWT con expiración, sesión guardada en el navegador y cierre
ante 401.

Todo código que se ejecuta en la página puede leer `localStorage` y `sessionStorage`. Eso incluye un
script inyectado por XSS o una dependencia comprometida.

## Decisión

1. Mientras se usa el panel, el token vive **en memoria**, en el estado de `ProveedorSesion`
   (`apps/web/src/features/autenticacion/components/ProveedorSesion.jsx`).
2. Además se guarda un **respaldo en `sessionStorage`** con la clave `corefaze.sesion`
   (`{ usuario, token }`). Solo `apps/web/src/lib/httpCliente.js` lo escribe, lo lee y lo borra
   (`guardarSesion`, `leerSesionGuardada`, `borrarSesionGuardada`).
3. **Nunca** se usa `localStorage`, ni cookies legibles por JavaScript. El token nunca se imprime en
   consola.
4. Al cargar la página, la sesión se restaura solo si el respaldo trae usuario y token, y si el
   `exp` del JWT no ha pasado. Si no, se borra.
5. El respaldo se borra:
   - al cerrar sesión;
   - cuando la API responde **401** a una solicitud que llevaba token;
   - cuando el token ya venció antes de enviarlo (`tokenVencido` revisa el `exp` y la solicitud no
     sale);
   - cuando el respaldo no se puede leer.

   En los casos de 401 y de token vencido, la persona vuelve a `/ingreso` con el aviso
   "Tu sesión expiró".

## Mitigaciones de XSS

- **JWT de 1 hora por defecto:** un token robado deja de servir al vencer. Además,
  `auth.middleware` recarga el usuario en cada petición: desactivarlo invalida su token al instante,
  y el rol sale de la base, no del token.
- **Semgrep, 2026-11-18:** 0 hallazgos en 178 reglas. Los conjuntos incluyen `p/react`, `p/xss`,
  `p/secrets` y `p/owasp-top-ten`.
- **Sin APIs que inyectan HTML o código:** el panel no usa `dangerouslySetInnerHTML`, `innerHTML`,
  `eval` ni `new Function`, y el estándar del web los prohíbe. React escapa todo el texto que
  muestra.
- **Sin CDN:** todas las dependencias se empaquetan desde npm. `npm audit` reporta 0
  vulnerabilidades en las dependencias de producción del web.
- **CSP:** hoy el panel no declara una política. helmet aplica CSP solo a las respuestas de la API
  (incluido `/api-docs`). Queda como siguiente paso: el servidor que publique el build envía
  `Content-Security-Policy` con `default-src 'self'` y `connect-src` limitado a la API.

## Consecuencias

- La sesión sobrevive a la recarga (F5) en la misma pestaña y se borra al cerrar la pestaña.
- Una pestaña nueva pide ingresar otra vez, porque `sessionStorage` no se comparte entre pestañas.
- **Riesgo aceptado:** un XSS que llegue a ejecutarse puede leer el token del respaldo. Las
  mitigaciones de arriba lo limitan.
- No hay refresh token: al vencer el JWT, la siguiente solicitud cierra la sesión.
- No hay lista de revocación: después de cerrar sesión, el token se borra del navegador, pero la API
  lo acepta hasta su `exp`.

## Alternativa que sigue abierta

**Cookie `httpOnly` + `SameSite=Strict` emitida por la API.** JavaScript nunca vería el token y la
sesión sobreviviría a la recarga. A cambio, exige cambios en la API (emitir y leer la cookie, CORS
con credenciales) y protección CSRF. Si el equipo la adopta, solo cambian `ProveedorSesion` y
`httpCliente`: el resto del panel solo usa `useSesion()`.

## Historial

**Versión 1 (2026-10-21), reemplazada.** El token vivía solo en memoria y no se escribía en ningún
almacenamiento del navegador. Al recargar se perdía la sesión, y se aceptaba ese costo de
usabilidad. La versión 2 conserva la memoria como fuente principal y agrega el respaldo en
`sessionStorage`, con su limpieza ante 401, al vencer o al cerrar sesión.
