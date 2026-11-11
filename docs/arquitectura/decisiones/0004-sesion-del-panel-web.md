# 0004 · Dónde vive la sesión del panel web

- **Estado:** aceptada (provisional hasta coordinar con la API; ver "Siguiente paso")
- **Tarea:** SCRUM-148
- **Fecha:** 2026-10-21

## Contexto

`POST /api/auth/login` devuelve `{ usuario, token }` con un JWT (HS256, 1 h por defecto). El panel web
debe enviar ese token en `Authorization: Bearer <token>` y decidir dónde guardarlo. Todo código que se
ejecuta en la página (incluido un script inyectado por XSS o una dependencia comprometida) puede leer
`localStorage` y `sessionStorage`.

## Decisión

El token se guarda **solo en memoria**, en una referencia de React dentro de `ProveedorSesion`
(`apps/web/src/features/autenticacion/components/ProveedorSesion.jsx`). No se escribe en
`localStorage`, `sessionStorage` ni en cookies legibles por JavaScript, y no se imprime en consola.

`lib/httpCliente.js` no guarda el token: lo pide a la sesión en cada solicitud (`vincularSesion`) y, si la
API responde **401** a una solicitud que llevaba token, avisa a la sesión para que se cierre. Como
`RutaPrivada` depende de la sesión, la persona vuelve a `/ingreso` con el aviso "Tu sesión terminó".

## Consecuencias

- Un XSS no puede robar el token de un almacenamiento persistente.
- **Al recargar la página (F5) o abrir otra pestaña se pierde la sesión** y hay que volver a ingresar.
  Es un costo de usabilidad aceptado por ahora.
- No hay refresh token: al vencer el JWT (1 h) la siguiente solicitud recibe 401 y se cierra la sesión.

## Alternativa descartada por ahora

Cookie `httpOnly` + `SameSite=Strict` emitida por la API: permite que la sesión sobreviva a la recarga y
que JavaScript nunca vea el token, pero exige cambios en la API (emitir y leer la cookie, CORS con
credenciales) y protección CSRF (Bloque 8).

## Siguiente paso

Si el equipo decide que la sesión debe sobrevivir a la recarga, acordar con la API la cookie `httpOnly`
y reemplazar `ProveedorSesion` y `httpCliente` (cambio localizado: el resto del panel solo usa
`useSesion()`). Hasta entonces, esta decisión se mantiene.
