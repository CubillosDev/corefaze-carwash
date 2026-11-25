# 0011 — Endpoints para la recepción en la app móvil

**Estado:** Aceptado (2026-11-23).

## Contexto

La app móvil (`apps/movil`) armaba la recepción con listas completas:

- `consultarPlaca` pedía `GET /api/vehiculos` (todos) para buscar la placa y `GET /api/ordenes-lavado` (todas, de
  todos los días) para calcular visitas, último servicio y servicio habitual en el teléfono.
- `JornadasRepository.abierta()` pedía todas las jornadas para quedarse con una.
- `ClientesRepository.buscarPorDocumento` y `listarActivos` de colaboradores también filtraban en el teléfono.

Los listados de la API no paginaban, y PostgREST corta cualquier select en 1.000 filas (`max_rows` en
`supabase/config.toml`). Con los datos de demostración (≈270 vehículos y 30 días de órdenes) y con el uso real, esto
pasaba en silencio:

- la app decía "placa no registrada" para un vehículo que sí existía;
- al registrarlo después, la API respondía 409 por placa duplicada;
- el historial salía incompleto.

Además, cada consulta movía miles de filas por la red móvil.

## Decisión

Se agrega a la API lo que la recepción necesita, en vez de seguir filtrando en el cliente. Todo es aditivo: ningún
endpoint existente cambia su contrato ni su sobre.

| Endpoint | Qué resuelve |
|---|---|
| `GET /api/vehiculos/consulta/:placa` | Vehículo, dueño e historial en una llamada. Placa no registrada → 200 con `registrado: false`. |
| `GET /api/jornadas/actual` | La jornada de hoy (Bogotá) o `null`, con `ordenesPorEstado`. |
| `GET /api/vehiculos?placa=` | Placa exacta. |
| `GET /api/ordenes-lavado?vehiculoId=&estado=` | Por vehículo y por una o varias fases. |
| `GET /api/clientes?estado=&tipo=&documento=` | Documento exacto, tipo y estado. |
| `GET /api/colaboradores?estado=` | Solo los activos (R2). |
| `GET /api/servicios?activo=` | Solo los activos; ya traía las tarifas por tipo de vehículo (R3). |

- **Agregados en SQL.** El historial (`historial_vehiculo()`) y el conteo por fase (`conteo_ordenes_por_estado()`) se
  calculan en Postgres y devuelven una sola fila. Ni la API ni el teléfono traen las órdenes. Son funciones `stable`
  con `search_path = ''`, solo para `service_role`; la API las protege con JWT y rol, igual que los reportes
  (ADR 0007).
- **Reglas del historial.**
  - `visitas` = órdenes no canceladas del vehículo;
  - el último servicio es la orden no cancelada más reciente por `creado_en`;
  - el habitual es el servicio con más órdenes no canceladas y, en empate, el tomado más recientemente.

  Es la misma regla que ya aplicaba la app.
- **Sin tope de 1.000 filas.** Los listados de vehículos, órdenes, clientes, colaboradores y servicios paginan por
  rangos con `listarSinTope` (sobre `traerTodasLasFilas`), ordenados por `id`. También los totales de
  `GET /api/jornadas` (`obtenerTotalesPorJornada`), que sumaban sobre una consulta truncada.
- **Ruta de la consulta.** Se usa `/api/vehiculos/consulta/:placa` y no `GET /api/vehiculos/:placa`. Así no choca con
  `/:id` (numérico) y deja claro que la respuesta no es el recurso vehículo sino una vista compuesta (vehículo + dueño
  + historial). Aunque la placa no exista, la respuesta es 200. La búsqueda simple por placa queda en
  `GET /api/vehiculos?placa=`.
- **Sin endpoint de catálogo.** No se crea `GET /api/recepcion/catalogo`: `GET /api/servicios` ya trae las tarifas
  por tipo, así que bastan los filtros `?activo=true` y `GET /api/colaboradores?estado=activo`. Son dos llamadas
  pequeñas y en paralelo, que la app ya hace, y no se duplica el contrato de servicios.
- **Roles.** Los mismos que hoy consultan vehículos, órdenes y jornadas: superadmin, administrador y soporte.

## Consecuencias

- La recepción hace una llamada por placa en vez de dos listados completos, y deja de dar falsos "no registrado".
- Los listados sin parámetros siguen respondiendo igual, ahora completos y ordenados por `id`. Antes el orden no
  estaba garantizado.
- Un listado completo ahora hace una consulta por cada 1.000 filas. Para pantallas que solo necesitan un subconjunto,
  lo indicado son los filtros nuevos.
- `GET /api/jornadas/actual` solo mira la fecha de hoy. Una jornada de un día anterior que siga abierta no aparece
  ahí, y para abrir la de hoy primero hay que cerrarla (`idx_jornadas_una_abierta`).
- La app Flutter se ajusta aparte, para usar estos endpoints.
- Migración nueva: `20261123120000_agregar_consultas_movil.sql`, con pruebas en
  `supabase/tests/consultas_movil_test.sql`.
