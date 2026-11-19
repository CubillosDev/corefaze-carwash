# 0005 — Pagos de crédito empresarial (SCRUM-158)

**Estado:** Aceptado.

## Contexto

Las empresas con `clientes.credito_habilitado = true` pueden registrar órdenes de lavado con `medio_pago = 'credito'` desde la Fase 1 (R8), pero hasta ahora nada en la base de datos registraba **cuándo y cómo se paga** esa deuda. El crédito de CarWash es deliberadamente simple: no hay vales, no hay cupo, no hay fecha de corte — un gerente de la empresa llega, elige qué órdenes paga, y las paga **completas** (nunca abonos parciales). El saldo pendiente de un cliente es, en todo momento, la suma de sus órdenes a crédito, no canceladas, sin pago asociado.

## Decisión

### Tabla `pagos_credito`

Un pago agrupa N órdenes del mismo cliente, pagadas de una sola vez. Es de **solo inserción**: `pagos_credito` nunca se actualiza ni se borra, ni siquiera por `service_role` (mismo patrón que `auditoria` — `revoke update, delete, truncate ... from service_role`, más los triggers `impedir_modificacion()`/`impedir_eliminacion()` para bloquear también al dueño de la tabla). `ordenes_lavado.pago_credito_id` (columna nueva, `null` hasta que se paga) apunta a la fila que la saldó.

### `registrar_pago_credito(p_cliente_id, p_orden_ids, p_usuario_id)`

Todo o nada: bloquea las filas de las órdenes indicadas (`select ... for update`, ordenadas por `id` para que dos pagos concurrentes que compartan alguna orden se serialicen en vez de hacer deadlock) y valida, en orden, que el arreglo no esté vacío ni tenga ids repetidos, que todas las órdenes existan, sean del cliente indicado, sean a crédito, estén `entregada` y no tengan ya un pago — si cualquier validación falla, no se escribe nada. Solo entonces crea el pago (con la suma de `valor`) y marca `pago_credito_id` en todas las órdenes.

Como el resto de las funciones de escritura de este proyecto (`reemplazar_tarifas_servicio`), no la puede ejecutar nadie salvo `service_role`: `revoke execute ... from public, anon, authenticated; grant execute ... to service_role`.

### `authenticated` nunca toca `pago_credito_id` directamente

**Hallazgo de diseño:** un `REVOKE` de una sola columna, aplicado DESPUÉS de un `GRANT` de tabla completa (como el `grant ... update on ordenes_lavado to authenticated` de `agregar_politicas_rls_por_rol.sql`), **no restringe nada** — confirmado probándolo: `has_column_privilege` devuelve verdadero si *cualquiera* de los dos niveles (tabla o columna) lo permite, y el `GRANT` de tabla ya cubre todas las columnas, incluidas las que se agreguen después con `ALTER TABLE`. La única forma de que `authenticated` pierda acceso de escritura a una columna específica es revocar el privilegio de **tabla completa** y volver a concederlo por **columnas explícitas**, sin la que se quiere proteger — eso es lo que hace esta migración para `pago_credito_id` (y lo que tendrá que repetir la de nómina para `liquidacion_id`). Mismo principio que ya se usaba para `usuarios.rol`, documentado aquí porque esta vez el GRANT de tabla ya existía de antes.

### `proteger_orden_lavado()`: el caso especial de una orden cerrada

El trigger existente bloqueaba **cualquier** cambio en una orden `entregada`/`cancelada`. `registrar_pago_credito()` necesita poner `pago_credito_id` en una orden ya `entregada` — así que la función (reemplazada aquí, `create or replace`, sin tocar la migración original) agrega un caso especial: permite que **únicamente** `pago_credito_id` pase de `null` a un valor, comparando el resto de la fila con `to_jsonb(old) - columnas_permitidas = to_jsonb(new) - columnas_permitidas` (mismo idioma que ya usa `registrar_auditoria()` para ignorar columnas técnicas). Cualquier otro cambio, incluso junto con `pago_credito_id`, cae al bloqueo general de siempre — confirmado que `'modificar una orden entregada falla con 23514'` (prueba ya existente en `reglas_negocio_test.sql`) sigue pasando sin cambios.

### R11 — una orden pagada no se cancela (defensa en profundidad, hoy inalcanzable)

Se agregó el chequeo explícito pedido ("una orden con `pago_credito_id` no se puede cancelar"), con un mensaje específico. **Hallazgo:** con la máquina de estados actual (`transicionesOrden.entregada = []`, ver `packages/contratos/dominio.json`), es inalcanzable hoy — `pago_credito_id` solo se asigna a órdenes ya `entregada`, y una orden `entregada` nunca vuelve a transicionar a ningún estado, ni siquiera `cancelada` (el bloqueo general de "orden cerrada" ya lo detendría primero). Se implementa igual, como defensa en profundidad explícita y documentada, por si la máquina de estados cambia más adelante — mismo espíritu que otros chequeos ya redundantes de este trigger (R10 vía API y vía BD, R9 solo en API).

### RLS de `pagos_credito`

Mismo patrón del ADR 0004: consultar (`SELECT`) para `superadmin`/`administrador`/`soporte`; sin ningún `GRANT` de `INSERT`/`UPDATE`/`DELETE` a `authenticated` — la única vía de escritura es la función, y solo `service_role` puede ejecutarla.

## Fuera de alcance

- Un endpoint HTTP que llame a `registrar_pago_credito()` — este PR es solo de base de datos (`apps/api` no se toca).
- Reportar el saldo pendiente de un cliente como una vista o función — no se pidió, y es trivial de calcular desde `apps/api` con el contrato ya existente (`ordenes_lavado` filtradas por `medio_pago='credito'`, `estado<>'cancelada'`, `pago_credito_id is null`).

## Consecuencias

- `ordenes_lavado` gana una columna más que `authenticated` no puede escribir directamente, con el mismo mecanismo de columnas explícitas que ya usaba `usuarios.rol` — un patrón a repetir, no a reinventar, para cualquier columna futura de "solo vía RPC".
- `pagos_credito_test.sql` cubre el camino feliz, cada validación por separado, la inmutabilidad (incluso para `service_role`), los privilegios de la función y la matriz RLS.
