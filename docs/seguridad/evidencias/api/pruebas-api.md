# Pruebas de seguridad de la API

Ejecutadas el 2026-11-23 21:57 UTC contra `http://localhost:3100/api` con `node scripts/pruebas-seguridad.js`. Tokens y llaves ocultos.

**Resultado:** 53 aprobada · 1 parcial · 2 no implementada · 2 fallida (de 58).

| ID | Guía | Categoría | Prueba | Endpoint | Rol | Esperado | Obtenido | Estado | Observación |
|---|---|---|---|---|---|---|---|---|---|
| AUT-01 | B8 P01 / P07 | Autenticación | Registro público que intenta pedir rol superadmin | `POST /api/auth/registro` | — | 201 y rol pendiente | 201 rol pendiente | **APROBADA** | El rol enviado se ignora: toda cuenta nace pendiente |
| AUT-02 | B8 P02 | Autenticación | Registro con correo duplicado | `POST /api/auth/registro` | — | 409 | 409 | **APROBADA** | Ya existe un usuario con ese correo electrónico |
| AUT-03 | B8 P03 / R11-1 / Cierre | Autenticación | Login correcto | `POST /api/auth/login` | superadmin | 200 | 200 | **APROBADA** | JWT recibido (oculto) |
| AUT-04 | B8 P04 / Cierre | Autenticación | Login con contraseña incorrecta | `POST /api/auth/login` | — | 401 | 401 | **APROBADA** | Credenciales inválidas |
| AUT-05 | R11-2 | Autenticación | Login con JSON inválido | `POST /api/auth/login` | — | 400 | 400 | **APROBADA** | El cuerpo de la petición no es un JSON válido; sin stack: true |
| AUT-06 | Lab 9 | Autenticación | Login de una cuenta desactivada | `POST /api/auth/login` | soporte inactivo | 403 | 403 | **APROBADA** | Usuario deshabilitado |
| AUT-07 | B8 P05 | Autenticación | Perfil con JWT válido | `GET /api/auth/perfil` | superadmin | 200 | 200 | **APROBADA** | sin passwordHash en la respuesta: true |
| AUT-08 | B8 P06 / R11-3 | Autenticación | Perfil sin JWT | `GET /api/auth/perfil` | — | 401 | 401 | **APROBADA** | Token de autenticación requerido |
| JWT-01 | Lab 9 | JWT | Token con el rol cambiado a superadmin (firma inválida) | `GET /api/usuarios` | soporte → superadmin | 401 | 401 | **APROBADA** | Token inválido |
| JWT-02 | Lab 9 | JWT | Token con alg "none" (sin firma) | `GET /api/usuarios` | — | 401 | 401 | **APROBADA** | Token inválido |
| JWT-03 | Cierre | JWT | Token vencido | `GET /api/auth/perfil` | soporte | 401 | 401 | **APROBADA** | Token expirado |
| JWT-04 | Lab 9 | JWT | Token firmado con otro secreto | `GET /api/auth/perfil` | — | 401 | 401 | **APROBADA** | Token inválido |
| JWT-05 | Cierre (JWT revocado) | JWT | Token vigente de una cuenta que el superadmin desactiva | `GET /api/auth/perfil` | pendiente | 200 → 401 | 200 → 401 | **APROBADA** | El usuario se recarga en cada petición: desactivarlo invalida su token al instante |
| JWT-06 | Cierre / R11-5 | JWT | Token después de "cerrar sesión" en el cliente | `GET /api/auth/perfil` | soporte | 401 (revocado) | 200 | **PARCIAL** | No hay endpoint de cierre de sesión ni lista de revocación: el token vale hasta su exp (8 h). El web lo borra de su lado |
| JWT-07 | R11 4–7 / Cierre | JWT | Cambio de contraseña que revoca tokens anteriores (version_sesion) | `—` | — | JWT anterior → 401 | sin endpoint | **NO IMPLEMENTADA** | Corefaze no tiene cambio de contraseña ni version_sesion |
| JWT-08 | R11 8–16 / Cierre | JWT | Recuperación con token o código de un solo uso | `—` | — | un solo uso | sin endpoint | **NO IMPLEMENTADA** | Corefaze no tiene recuperación de cuenta; la contraseña la restablece el superadmin por fuera |
| KEY-01 | B8 P35 | API Key | Recurso sin X-API-Key | `GET /api/clientes` | superadmin | 401 | 401 | **APROBADA** | API Key requerida |
| KEY-02 | Lab 6 | API Key | API Key inventada | `GET /api/clientes` | superadmin | 401 | 401 | **APROBADA** | API Key inválida |
| KEY-03 | R11-20 | API Key | Cliente privado sin API Key | `GET /api/seguridad/cliente` | — | 401 | 401 | **APROBADA** | API Key requerida |
| KEY-04 | R11-21 | API Key | Cliente privado con API Key válida | `GET /api/seguridad/cliente` | — | 200 | 200 | **APROBADA** | cliente: undefined; sin hash: true |
| KEY-05 | R11-22 / patrón | API Key | Login sin API Key con cuerpo inválido | `POST /api/auth/login` | — | 400 (no "API Key requerida") | 401 | **FALLIDA** | API Key requerida. Desviación del patrón: el login exige la llave del panel |
| RBAC-01 | Lab 8 | RBAC | Soporte intenta crear un cliente | `POST /api/clientes` | soporte | 403 | 403 | **APROBADA** | No tiene permisos para realizar esta operación |
| RBAC-02 | Lab 8 | RBAC | Cuenta pendiente consulta clientes | `GET /api/clientes` | pendiente | 403 | 403 | **APROBADA** | No tiene permisos para realizar esta operación |
| RBAC-03 | Lab 8 / B8 BA09 | Escalada | Soporte intenta volver superadmin a otra cuenta | `PATCH /api/auth/usuarios/:id/rol` | soporte | 403 | 403 | **APROBADA** | No tiene permisos para realizar esta operación |
| RBAC-04 | Lab 8 | Escalada | Administrador intenta volverse superadmin a sí mismo | `PATCH /api/auth/usuarios/:id/rol` | administrador | 403 | 403 | **APROBADA** | No tiene permisos para realizar esta operación |
| RBAC-05 | B8 SEG / BOLA | BOLA/IDOR | Soporte lista las cuentas de usuario | `GET /api/usuarios` | soporte | 403 | 403 | **APROBADA** | No tiene permisos para realizar esta operación |
| RBAC-06 | B8 P34 / SEG-02 | BOLA/IDOR | Soporte consulta por id la cuenta de otro usuario | `GET /api/usuarios/:id` | soporte | 403 | 403 | **APROBADA** | No tiene permisos para realizar esta operación |
| RBAC-07 | B8 SEG-02 | BOLA/IDOR | Cuenta pendiente consulta por id la cuenta de otro usuario | `GET /api/usuarios/:id` | pendiente | 403 | 403 | **APROBADA** | No tiene permisos para realizar esta operación |
| RBAC-08 | Cierre (dashboard) | RBAC | Soporte consulta el resumen del negocio | `GET /api/reportes/resumen` | soporte | 403 | 403 | **APROBADA** | No tiene permisos para realizar esta operación |
| RBAC-09 | Cierre (dashboard) | RBAC | Administrador consulta el resumen del negocio | `GET /api/reportes/resumen` | administrador | 200 | 200 | **APROBADA** | Indicadores disponibles |
| RBAC-10 | Lab 8 | RBAC | Soporte consulta la nómina (salarios) | `GET /api/nomina/quincenas/resumen` | soporte | 403 | 403 | **APROBADA** | No tiene permisos para realizar esta operación |
| RBAC-11 | Lab 10 | RBAC | Administrador intenta reabrir una jornada cerrada | `PATCH /api/jornadas/:id/estado` | administrador | 403 | 403 | **APROBADA** | Solo superadmin puede reabrir una jornada |
| VAL-01 | Lab 3 / A03 | Inyección | Búsqueda con inyección SQL clásica (' OR 1=1 --) | `GET /api/usuarios?busqueda=` | superadmin | 200 sin datos extra | 200, 0 de 17 | **APROBADA** | El texto se busca literal; supabase-js parametriza |
| VAL-02 | A03 | Inyección | Inyección de filtros de PostgREST en la búsqueda (,email.ilike.%) | `GET /api/usuarios?busqueda=` | superadmin | 200 sin ampliar resultados | 200, 0 de 17 | **APROBADA** | patronIlikeSeguro encierra el patrón entre comillas |
| VAL-03 | Lab 3 | Validación | Placa con formato inválido | `POST /api/vehiculos` | superadmin | 400 | 400 | **APROBADA** | {"campo":"placa","mensaje":"La placa debe tener el formato ABC123 (carro) o ABC12D (moto)"} |
| VAL-04 | Lab 3 | Validación | Cuerpo de más de 10 KB | `POST /api/auth/login` | — | 413 | 413 | **APROBADA** | El cuerpo de la petición supera el tamaño permitido |
| VAL-05 | Lab 3 | Validación | Identificador que no es un número | `GET /api/clientes/:id` | superadmin | 400 | 400 | **APROBADA** | Datos de entrada inválidos |
| VAL-06 | B8 | Validación | Recurso inexistente | `GET /api/clientes/:id` | superadmin | 404 | 404 | **APROBADA** | Cliente no encontrado |
| NEG-01 | B8 P26 / A04 | Asignación masiva | Crear orden enviando valor 1 y estado entregada | `POST /api/ordenes-lavado` | superadmin | 201, valor de tarifa y estado registrada | 201, valor 22000, registrada | **APROBADA** | El servidor calcula el valor (tarifa 22000) e ignora el estado (R4) |
| NEG-02 | B8 P27 | Reglas | Orden con un vehículo inexistente | `POST /api/ordenes-lavado` | superadmin | 404 | 404 | **APROBADA** | Vehículo no encontrado |
| NEG-03 | B8 P28 (R2) | Reglas | Orden para un colaborador inactivo | `POST /api/ordenes-lavado` | superadmin | 409 | 409 | **APROBADA** | No se puede asignar una orden a un colaborador inactivo |
| NEG-04 | B8 P29 (R6) | Reglas | Segunda orden abierta para la misma placa | `POST /api/ordenes-lavado` | superadmin | 409 | 409 | **APROBADA** | El vehículo ya tiene una orden abierta |
| NEG-05 | B8 P30 / Cierre (índice único) | Reglas | Turno repetido en la misma fecha | `POST /api/ordenes-lavado` | superadmin | 409 | 409 | **APROBADA** | El turno ya está ocupado para esa fecha |
| NEG-06 | R7 | Reglas | Lavado de motor sin autorización del cliente | `POST /api/ordenes-lavado` | superadmin | rechazo (400 o 409) | 409 | **APROBADA** | Este servicio exige autorización explícita para lavado de motor |
| NEG-07 | R8 | Reglas | Crédito para un cliente sin crédito habilitado | `POST /api/ordenes-lavado` | superadmin | rechazo (400 o 409) | 409 | **APROBADA** | El cliente no tiene crédito habilitado |
| NEG-08 | B8 P33 (R9) | Reglas | Saltar de registrada a terminada | `PATCH /api/ordenes-lavado/:id/estado` | superadmin | 409 | 409 | **APROBADA** | Transición de estado no permitida: de registrada a terminada |
| NEG-09 | Lab 10 | RBAC | Soporte intenta anular una orden | `PATCH /api/ordenes-lavado/:id/estado` | soporte | 403 | 403 | **APROBADA** | Solo superadmin o administrador pueden anular una orden |
| NEG-10 | Reglas | Validación | Anular sin motivo | `PATCH /api/ordenes-lavado/:id/estado` | superadmin | 400 | 400 | **APROBADA** | Datos de entrada inválidos |
| NEG-11 | R10 | Reglas | Modificar una orden ya cancelada | `PATCH /api/ordenes-lavado/:id` | superadmin | 409 | 409 | **APROBADA** | No se puede editar una orden entregada o cancelada |
| XSS-01 | A03 (XSS almacenado) | XSS | La API guarda y devuelve el texto con HTML como dato, sin interpretarlo | `GET /api/ordenes-lavado/:id` | superadmin | 200, JSON | 200, application/json | **APROBADA** | El escape lo hace React al mostrarlo (ver pruebas del web) |
| CAB-01 | R11 Paso 10 | CORS | Preflight desde el panel web | `OPTIONS /api/auth/login` | — | 204 | 204 | **APROBADA** | Allow-Origin: http://localhost:5173 |
| CAB-02 | Lab 3 | CORS | Preflight desde un origen ajeno | `OPTIONS /api/auth/login` | — | no refleja el origen | http://localhost:5173 | **APROBADA** | Solo se permite ALLOWED_ORIGIN |
| CAB-03 | Lab 3 (helmet) | Cabeceras | Cabeceras de seguridad y sin X-Powered-By | `GET /api/salud` | — | presentes | CSP sí, HSTS sí, nosniff sí, X-Powered-By no | **APROBADA** | helmet() |
| CAB-04 | A01 (CSRF) | CSRF | El login no deja cookies de sesión | `POST /api/auth/login` | — | sin Set-Cookie | sin Set-Cookie | **APROBADA** | El token viaja en Authorization: Bearer; un sitio ajeno no puede enviarlo solo (CSRF no aplica) |
| CAB-05 | R11-25 | Swagger | Documentación publicada en /api-docs | `GET /api-docs` | — | 200 | 200 | **APROBADA** | Esquemas BearerAuth y ApiKeyAuth: ver evidencias/api/swagger.md |
| LIM-01 | Patrón del curso | Fuerza bruta | 25 intentos de login fallidos seguidos | `POST /api/auth/login` | — | 429 | 401 | **FALLIDA** | No hay límite de intentos (express-rate-limit pendiente) |
| RLS-01 | R11 Verif. 07 | RLS | La llave anon lee clientes directo por PostgREST | `GET /rest/v1/clientes` | anon | denegado o vacío | 401 42501 | **APROBADA** | {"code":"42501","details":null,"hint":"Grant the required privileges to the curr |
| RLS-02 | R11 Verif. 07 | RLS | La llave anon intenta leer hashes de contraseña | `GET /rest/v1/usuarios` | anon | denegado | 401 42501 | **APROBADA** | {"code":"42501","details":null,"hint":"Grant the required privileges to the curr |
