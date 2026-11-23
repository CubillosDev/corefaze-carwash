# Bootstrap del superadministrador (Bloque 8, BA01–BA09)

Script: `npm run seed:superadmin` (`src/scripts/crearSuperAdmin.js`). BA08 y BA09 se hicieron solo en la base aislada de pruebas (`corefaze-pruebas`, puerto 55321), como exige la guía. Fecha: 2026-11-23.

| ID | Escenario | Esperado | Resultado | Estado |
|---|---|---|---|---|
| BA01 | Bootstrap con superadmin existente (base de trabajo) | No inserta ni modifica | Ya existe un superadmin, no se modificó nada (salida=0) | APROBADA |
| BA02 | Segunda ejecución | No duplica | Ya existe un superadmin, no se modificó nada | APROBADA |
| BA03 | Superadmins antes y después | Iguales | antes 2, después 2 | APROBADA |
| BA04 | Login del superadmin existente | 200 y JWT | Ver AUT-03 en pruebas-api.md | APROBADA |
| BA05 | Iniciar la API sin variables SUPERADMIN_* | Express arranca normalmente | GET /api/salud → 200 | APROBADA |
| BA06 | Recurso protegido con API Key y JWT | Respuesta según RBAC | Ver RBAC-01 a RBAC-11 en pruebas-api.md | APROBADA |
| BA07 | Bootstrap sin SUPERADMIN_* | Error controlado, salida distinta de 0 | No hay credenciales SUPERADMIN_* configuradas (salida=1) | APROBADA |
| BA09 | Base aislada sin superadmin, correo de una cuenta soporte existente | Rechaza la elevación | El correo configurado en SUPERADMIN_EMAIL ya pertenece a un usuario con rol soporte; no se eleva automáticamente (salida=1); el rol sigue siendo soporte; superadmins: 0 | APROBADA |
| BA08 | Base aislada sin superadmin, bootstrap válido | Crea exactamente uno | Superadmin inicial creado: id 286; superadmins: 1 | APROBADA |

Al terminar se restauraron los superadmins originales de la base aislada y la cuenta creada en BA08 quedó desactivada.

## Persistencia tras reinicio (Bloque 8, P36)

Se consultó la orden 2872 con `GET /api/ordenes-lavado/2872`, se detuvo el proceso de Node.js, se reinició la API y se volvió a consultar.

| Momento | Respuesta |
|---|---|
| Antes de reiniciar | `{"estado":200,"orden":{"id":2872,"estado":"cancelada","valor":22000,"fecha":"2026-11-19","observaciones":"[PRUEBA-SEG] <img src=x onerror=alert(1)>"}}` |
| Después de reiniciar | `{"estado":200,"orden":{"id":2872,"estado":"cancelada","valor":22000,"fecha":"2026-11-19","observaciones":"[PRUEBA-SEG] <img src=x onerror=alert(1)>"}}` |

Resultado: **APROBADA**. El ID, el estado, el valor, la fecha y las observaciones son iguales, porque los datos viven en PostgreSQL y no en la memoria del proceso.
