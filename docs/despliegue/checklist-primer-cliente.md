# Checklist antes del primer cliente

Bloqueantes que hay que cerrar antes de montar producción y recibir datos reales. Cada punto tiene un responsable y
un estado (**Pendiente**, **Parcial**, **Hecho** o **Aceptado**).

Al cerrar un punto, se marca con la fecha y el PR que lo resolvió.

## API

| # | Punto | Responsable | Estado |
|---|---|---|---|
| 1 | **Límite de intentos en el login.** Hoy se pueden probar contraseñas sin freno. | Olarte | Pendiente |
| 2 | **Login sin API Key.** Patrón del curso: login público + JWT. Hoy `/api/auth/login` exige `X-API-Key`. | Olarte | Pendiente |
| 3 | **Paginación.** PostgREST corta en 1.000 filas y rompe listas y totales. Nómina y reportes ya suman en SQL; los listados todavía no paginan. | Olarte | Parcial |
| 4 | **Pruebas sin residuos.** Las pruebas de la API dejan datos en la base donde corren, y algunas fallan según el orden (`servicios.service`). Además, corren contra el Supabase local de la máquina, que también puede tener datos demo. Deben limpiar lo que crean o usar su propia base. | Olarte | Pendiente |
| 5 | **Quincena actual desde la API.** La API debe devolverla. Hoy el web calcula los límites solo para poder consultar. | Olarte | Pendiente |
| 6 | **`diferenciaCaja`** siempre llega en `null`. | Olarte | Pendiente |
| 7 | **Campo `codigo` en los errores 401**, para que el cliente distinga API Key inválida de credenciales inválidas. | Olarte | Pendiente |

## Seguridad

| # | Punto | Responsable | Estado |
|---|---|---|---|
| 8 | **`npm audit` sin vulnerabilidades altas.** Ya no hay altas: se corrigieron body-parser y vite (PR de CI). Quedan 19 moderadas en la API que piden `npm audit fix --force` (cambios mayores). | Por asignar | Parcial |
| 9 | **Rotar las llaves que estuvieron en `.env.example`** (commits `326fd4d`, `2ec4a9f` y `e424c4b`), si se usaron en algún entorno. Los secretos de pruebas se generan nuevos. | Olarte | Pendiente |
| 10 | **`API_KEY_MOVIL` y `VITE_API_KEY` son públicas por diseño:** viajan en el APK y en el JavaScript del panel. Identifican la app; la protección real es JWT + roles. | — | Aceptado |
| 11 | **`service_role` y BYPASSRLS frente a RLS.** La API usa `service_role`, que salta RLS. Hay que revisar que cada endpoint aplique los permisos por rol y definir si RLS se vuelve una barrera efectiva (ADR 0009). | Olarte | Pendiente |
| 12 | **CSP y encabezados de seguridad del panel y la landing** (`vercel.json`). Falta verificarlos en pruebas. | Diego | Parcial |

## Operación

| # | Punto | Responsable | Estado |
|---|---|---|---|
| 13 | **Respaldos.** Se recomienda el plan pago de Supabase en producción: el gratuito no restaura a un punto en el tiempo y se pausa sin uso. | Por asignar | Pendiente |
| 14 | **Render pago en producción**, para que la API no se duerma (el gratuito tarda ~1 minuto en despertar). | Por asignar | Pendiente |
| 15 | **Monitoreo en los dos entornos** (UptimeRobot sobre `/api/salud`). | Diego | Pendiente |
| 16 | **Dominio propio con HTTPS** para el panel, la landing y, si aplica, la API. Al cambiarlo, actualizar `connect-src` de la CSP. | Por asignar | Pendiente |
| 17 | **Keystore del APK** respaldado fuera del repositorio. Sin él, la app no se puede actualizar. | Por asignar | Pendiente |
| 18 | **Superadmin con contraseña fuerte y cuentas por persona** (nada de usuarios compartidos). | Por asignar | Pendiente |

## Legal

| # | Punto | Responsable | Estado |
|---|---|---|---|
| 19 | **Política de tratamiento de datos personales (Ley 1581 de 2012)**, autorización del titular (clientes y colaboradores) y responsable del tratamiento. Pendiente de revisión legal. | Dueño del producto | Pendiente |

## Producto y técnica

| # | Punto | Responsable | Estado |
|---|---|---|---|
| 20 | **Quién mantiene la app móvil** (`apps/movil`). | Equipo | Pendiente |
| 21 | **Dependencia circular entre Clientes y Órdenes.** | Equipo | Pendiente |
| 22 | **Landing:** destino del formulario "Agenda tu demo" (endpoint, correo o WhatsApp) y enlaces de App Store y Google Play. | Dueño del producto | Pendiente |
