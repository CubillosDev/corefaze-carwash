# 0003 — Mapeo de roles para RBAC (SCRUM-139)

**Estado:** Propuesto — pendiente de aprobación del equipo (Diego Cubillos, Cristian Olarte, Diego Urbano).

## Contexto

Hoy todas las rutas `/api/*` solo exigen `X-API-Key`. JWT solo protegía `GET /api/auth/perfil`. Como la API Key del panel web es pública en el navegador (cualquier usuario del front puede leerla en las DevTools), cualquiera que la obtenga puede leer y escribir todos los datos del sistema — clientes, vehículos, servicios, colaboradores, jornadas y órdenes de lavado — sin distinción de quién es la persona detrás de la petición.

La historia original de autenticación (SCRUM-23, cerrada) describía tres roles de negocio: `DUEÑO`, `ADMINISTRADOR` y `OPERADOR`. Sin embargo, el dominio compartido del monorepo (`packages/contratos/dominio.json`, campo `roles`) ya define y usa en producción un catálogo distinto: `superadmin`, `administrador`, `soporte`, `pendiente`. Este catálogo fue introducido y probado en el commit `cfaa495` (RBAC inicial en Colaboradores, alcance SCRUM-139) y es el que consume `autorizarRoles(...)` en `roles.middleware.js`. No se puede "volver" al nombrado de SCRUM-23 sin deshacer trabajo ya probado y desplegado en la rama.

Este ADR formaliza el mapeo entre ambos nombrados, para que quede documentado una sola vez y no como una decisión implícita repartida en el código.

## Decisión

Se adopta el catálogo de roles ya vigente en `dominio.json`, mapeado a la intención original de SCRUM-23 así:

| Rol de la historia original (SCRUM-23) | Rol en el dominio (`dominio.json`) | Alcance |
| --- | --- | --- |
| `DUEÑO` | `superadmin` | Acceso total: todos los recursos de negocio, asignación de roles (`PATCH /api/auth/usuarios/:id/rol`), y las únicas operaciones de "excepción administrativa" (reabrir una jornada ya cerrada). |
| `ADMINISTRADOR` | `administrador` | Operación diaria completa: gestiona clientes, vehículos, servicios, colaboradores, jornadas y órdenes de lavado. No puede asignar roles ni reabrir una jornada cerrada. |
| `OPERADOR` | `soporte` | Registra el trabajo del día a día: puede consultar todo, crear/editar órdenes de lavado, abrir/cerrar jornadas. No puede gestionar (crear/editar/eliminar) clientes, vehículos, colaboradores ni el catálogo de servicios, ni anular (cancelar) una orden, ni reabrir una jornada. |
| *(no existía en SCRUM-23)* | `pendiente` | Estado transitorio del registro público (`POST /api/auth/registro`). Sin acceso a ningún recurso de negocio hasta que un `superadmin` le asigne un rol operativo. |

### Matriz de permisos por recurso

| Recurso | Lectura (GET) | Mutación (POST/PUT/PATCH) | Notas |
| --- | --- | --- | --- |
| Clientes | superadmin, administrador, soporte | superadmin, administrador | soporte necesita consultar clientes para registrar órdenes, pero no gestionarlos. |
| Vehículos | superadmin, administrador, soporte | superadmin, administrador | Mismo criterio que Clientes. |
| Servicios (catálogo/tarifas) | superadmin, administrador, soporte | superadmin, administrador | Las tarifas se tratan como "operación", no como "configuración" del negocio. Si el equipo prefiere restringir la mutación solo a `superadmin`, es un cambio futuro sobre este ADR, no una ambigüedad resuelta aquí. |
| Colaboradores | superadmin, administrador, soporte | superadmin, administrador | Sin cambios respecto al alcance inicial (commit `cfaa495`). |
| Órdenes de lavado | superadmin, administrador, soporte | **Registrar y editar:** superadmin, administrador, soporte (es el trabajo central del operador). **Anular (cancelar):** superadmin, administrador únicamente — exige `motivo`, regla ya validada en R10. | `soporte` puede avanzar una orden por cualquier transición de estado excepto cancelarla. |
| Jornadas | superadmin, administrador, soporte | **Abrir/cerrar:** superadmin, administrador, soporte. **Reabrir:** superadmin únicamente (criterio de aceptación explícito de SCRUM-139). | `abiertaPor`/`cerradaPor` quedan con el email del usuario autenticado (antes, siempre `null`). |
| Asignación de roles (`PATCH /api/auth/usuarios/:id/rol`) | — | superadmin únicamente | Sin cambios respecto al alcance inicial. |

### Por qué una regla condicional en vez de un middleware estático en dos casos

Dos operaciones de la matriz (anular una orden, reabrir una jornada) comparten el mismo endpoint HTTP que el resto de transiciones de su recurso (`PATCH /:id/estado`): el verbo de negocio va en el valor del campo `estado` del body, no en la URL ni en el método HTTP. Por eso `autorizarRoles(...)` —que decide solo por rol, sin mirar el body— no alcanza para expresar "soporte puede cambiar el estado, excepto a cancelada" o "cualquiera de los tres roles puede cambiar el estado, excepto a abierta (reabrir)". Ambas rutas resuelven esto con un middleware adicional, específico de ese recurso (`exigirPermisoParaCancelar` en `ordenesLavado.routes.js`, `exigirSuperadminParaReabrir` en `jornadas.routes.js`), que corre después de `validar` (para poder leer `req.datos.cuerpo.estado` ya validado) y antes del controller.

## Fuera de alcance de esta decisión

- **Pantallas web de permisos** (`[WEB] Inicio de sesión...`): la UI que consume estos roles no se construye en este cambio.
- **El recurso completo de administración de usuarios** (`SCRUM-141`, `/api/usuarios`): `PATCH /api/auth/usuarios/:id/rol` es únicamente el bootstrap mínimo que permitió construir y probar RBAC (ver commit `cfaa495`). Cuando se construya `SCRUM-141` (con `GET /api/usuarios`, `GET /api/usuarios/:id`, `PATCH /api/usuarios/:id/rol`, `PATCH /api/usuarios/:id/estado`), el equipo deberá decidir explícitamente si ese endpoint se consolida dentro de `/api/usuarios` o convive con él. Este ADR no toma esa decisión ni la anticipa: la deja pendiente para quien tome `SCRUM-141`.

## Consecuencias

- Toda la superficie de negocio de la API (`clientes`, `vehículos`, `servicios`, `colaboradores`, `órdenes de lavado`, `jornadas`) exige ahora API Key **y** JWT con un rol autorizado; la API Key sigue siendo obligatoria en paralelo (defensa en profundidad), nunca sustituida por JWT.
- Un usuario `pendiente` no puede operar ningún recurso de negocio hasta que un `superadmin` le asigne rol — cierra el vector de "me registro y ya tengo acceso" que existía mientras RBAC solo cubría Colaboradores.
- Las pruebas de integración de cada recurso ahora verifican, además del contrato de negocio, el contrato de autorización: 401 sin JWT, 403 con rol sin permiso, 200/201 con rol permitido.
- Esta decisión queda **propuesta**, no aceptada: la matriz de permisos (en particular, si tarifas de Servicios debería restringirse solo a `superadmin`) debe confirmarse con el equipo antes de cerrar el criterio de aceptación de SCRUM-139 que pide el ADR.
