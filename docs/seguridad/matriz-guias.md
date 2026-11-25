# Matriz: guías del curso → pruebas de Corefaze

Las guías usan como ejemplo la "API Hospital", con pacientes, médicos, consultorios y citas. Esta matriz traduce cada prueba pedida a su equivalente en Corefaze y señala el resultado. Equivalencias:

| API Hospital | Corefaze |
|---|---|
| Paciente (solo lo suyo) | Cuenta `pendiente` (sin acceso) y `soporte` (operación sin datos sensibles) |
| Médico | `soporte`, que registra y mueve órdenes |
| Administrador | `administrador` y `superadmin` |
| Cita | Orden de lavado |
| Médico ocupado a la misma hora (índice único) | Turno repetido en la misma fecha (R5) |
| `seed:admin` / `ADMIN_*` | `seed:superadmin` / `SUPERADMIN_*` |

Estados: ✅ aprobada · ⚠️ parcial · ❌ fallida · ⛔ no implementada en Corefaze · ↔ difiere por diseño.

## 1. Guía de cierre, §8 "Pruebas finales sugeridas" (`readme.md`)

| Pide | Prueba de Corefaze | Resultado |
|---|---|---|
| Login correcto e incorrecto | AUT-03, AUT-04, WEB-02 | ✅ 200 con JWT, 401 |
| Paciente consulta citas propias y ajenas | RBAC-05, RBAC-06 y RBAC-07: soporte y pendiente consultan cuentas ajenas | ✅ 403 |
| Médico consulta sus citas asignadas | No aplica: en Corefaze los colaboradores no tienen cuenta y el soporte ve las órdenes del lavadero completo | ↔ |
| Médico intenta atender una cita ajena | NEG-09 (soporte intenta anular una orden), RBAC-11 | ✅ 403 |
| Administrador consulta el dashboard | RBAC-09 (administrador → 200), RBAC-08 (soporte → 403) | ✅ |
| Crear cita en horario ocupado (índice único) | NEG-05 (turno repetido), NEG-04 (placa con orden abierta) | ✅ 409 |
| JWT vencido o revocado → 401 y cierre controlado | JWT-03, JWT-05, WEB-05, WEB-06 | ✅ 401; la web vuelve a `/ingreso` con "Tu sesión expiró" |
| Cambiar la contraseña revoca los tokens (`version_sesion`) | JWT-07 | ⛔ No existe cambio de contraseña (H-03) |
| Código de recuperación no reutilizable | JWT-08 | ⛔ No existe recuperación (H-03) |
| `npm run build` y lint del frontend | `evidencias/calidad/` | ✅ Sin errores |

## 2. README 11, Paso 8: 25 pruebas en Swagger

| # | Pide | Prueba de Corefaze | Resultado |
|---|---|---|---|
| 1 | Login válido → 200 y JWT | AUT-03 | ✅ |
| 2 | Login con JSON inválido → 400 | AUT-05 (sin traza en la respuesta) | ✅ |
| 3 | Recurso protegido sin JWT → 401 | AUT-08 | ✅ |
| 4–7 | Cambio de contraseña, `version_sesion`, JWT anterior → 401 | JWT-07 | ⛔ |
| 8–11 | Recuperación administrativa con token de un solo uso; no admin → 403 | JWT-08. El 403 para un no admin en funciones administrativas se cubre con RBAC-03 y RBAC-04 | ⛔ / ✅ |
| 12–16 | Ocho códigos de respaldo, consumo único | JWT-08 | ⛔ |
| 17 | `mis-citas` con JWT → 200 | AUT-07 (perfil propio) | ✅ |
| 18 | Citas de otro paciente → 403 | RBAC-06, RBAC-07 | ✅ |
| 19 | Ruta administrativa con JWT de paciente → 403 | RBAC-02, RBAC-05 | ✅ |
| 20 | Cliente privado sin API Key → 401 | KEY-03 | ✅ |
| 21 | Cliente privado con API Key → 200 | KEY-04 | ✅ |
| 22 | Login sin API Key y cuerpo inválido → 400 | KEY-05: Corefaze responde 401 "API Key requerida" | ❌ (H-04) |
| 23 | Sin JWT y sin API Key → 401 | KEY-01, AUT-08 | ✅ |
| 24 | Con JWT y sin API Key → 200 | KEY-01: Corefaze exige API Key **y** JWT en todos los recursos, lo que es más estricto | ↔ |
| 25 | Esquemas de Swagger | CAB-05 y `evidencias/api/swagger.md`: `ApiKeyAuth` y `BearerAuth` | ✅ |
| Paso 10 | CORS: preflight → 204 | CAB-01 (204) y CAB-02 (origen ajeno no reflejado) | ✅ |

### Verificaciones de base de datos (README 11)

| Verificación | Pide | Resultado en Corefaze (`evidencias/bd/verificacion-bd.md`) |
|---|---|---|
| 01 | Tablas con RLS habilitado | ✅ 23 de 23 tablas de `public` |
| 02–05 | Columnas, claves e índices del esquema de recuperación | ⛔ No existe ese esquema (H-03). Los índices de negocio sí se prueban con NEG-04 y NEG-05 |
| 07 | Auditoría de políticas y privilegios | ✅ 44 políticas. Ninguna `USING (true)` para `anon`. `anon` no tiene privilegios sobre tablas ni funciones |
| 08 | Identidad real del backend y BYPASSRLS | ⚠️ La API usa `service_role`, que tiene BYPASSRLS. El control real está en Express (H-08) |
| Paso 11.6 | Conclusión RLS frente a Express | En el informe, sección "Discusión" |

## 3. Bloque 8 (`LAB/README_BLOQUE_8.md`)

### P01–P36

| Rango | Pide | Prueba de Corefaze | Resultado |
|---|---|---|---|
| P01–P02 | Registro válido y correo duplicado | AUT-01, AUT-02 | ✅ 201 y 409 |
| P03–P06 | Login, contraseña errada, perfil con y sin JWT | AUT-03, AUT-04, AUT-07, AUT-08 | ✅ |
| P07 | Pedir rol administrador en el registro público | AUT-01: el rol enviado se ignora y la cuenta nace `pendiente` | ✅ |
| P08–P25 | CRUD de pacientes, médicos y consultorios (duplicados → 409, borrar con dependencias → 409) | Se cubre con la suite de integración de la API (`apps/api/tests/integration`, en CI) para clientes, vehículos, colaboradores y servicios. En seguridad: VAL-03, VAL-05 y VAL-06 | ✅ |
| P26 | Crear cita válida → 201 | NEG-01: además, el servidor ignora el valor y el estado enviados (R4) | ✅ |
| P27 | Médico inexistente | NEG-02 (vehículo inexistente → 404) | ✅ |
| P28 | Médico inactivo → 409 | NEG-03 (colaborador inactivo, R2) | ✅ |
| P29–P30 | Médico o consultorio ocupado → 409 | NEG-04 (R6), NEG-05 (R5) | ✅ |
| P31–P33 | Transiciones de estado; atendida → programada → 409 | NEG-08 (salto no permitido, R9), NEG-11 (orden cerrada, R10) | ✅ |
| P34 | Paciente consulta una cita ajena → 403 | RBAC-06, RBAC-07 | ✅ |
| P35 | Acceso sin X-API-Key | KEY-01 (401), KEY-02 (llave inventada → 401) | ✅ |
| P36 | Reiniciar la API y volver a consultar | `bootstrap-superadmin.md`: la orden 2872 es idéntica antes y después | ✅ |

### SEG-01–SEG-08

| ID | Pide | Prueba de Corefaze | Resultado |
|---|---|---|---|
| SEG-01 | Consultar lo propio → 200 | AUT-07 | ✅ |
| SEG-02 | Consultar lo ajeno → 403 | RBAC-06, RBAC-07 | ✅ |
| SEG-03 | Listar solo lo propio | RBAC-05: soporte no puede listar cuentas | ✅ |
| SEG-04 | Médico ve sus citas | No aplica (ver §1) | ↔ |
| SEG-05 / SEG-06 | Médico A consulta la agenda o una cita del médico B → 403 | RBAC-10 (soporte → nómina 403), RBAC-08 | ✅ |
| SEG-07 | Médico intenta una acción administrativa → 403 | RBAC-01, RBAC-03, NEG-09 | ✅ |
| SEG-08 | Administrador consulta → 200 | RBAC-09 | ✅ |

### BA01–BA09 (bootstrap del primer administrador)

Todas en `evidencias/api/bootstrap-superadmin.md`: **9 de 9 aprobadas**. BA08 y BA09 se corrieron solo en la base aislada de pruebas, como exige la guía.

## 4. Pruebas adicionales (OWASP Top 10 y laboratorios)

| Grupo | IDs | Qué cubre |
|---|---|---|
| Manipulación de JWT | JWT-01, JWT-02, JWT-04 | Rol alterado, `alg: none`, firma con otro secreto |
| Inyección | VAL-01, VAL-02 | Inyección SQL clásica e inyección de filtros de PostgREST |
| Tamaño del cuerpo | VAL-04 | Cuerpo de más de 10 KB → 413 |
| XSS almacenado | XSS-01, WEB-04 | `<img src=x onerror=alert(1)>` se guarda como dato y se muestra como texto |
| Cabeceras y CSRF | CAB-03, CAB-04, WEB-09 | helmet, sin `X-Powered-By`, sin cookies de sesión, CSP de la web |
| Fuerza bruta | LIM-01 | 25 intentos sin bloqueo → ❌ (H-01) |
| Acceso directo a la base | RLS-01, RLS-02 | La llave `anon` no lee tablas por PostgREST (42501) |
| Almacenamiento en el navegador | WEB-03, WEB-07 | Solo `sessionStorage`; cerrar sesión lo borra |
