# 0010 — Devolver una orden de lavado a la fase anterior (por ahora)

**Estado:** Aceptado como medida temporal (decisión del dueño del producto, 2026-11-20).

## Contexto

La máquina de estados de la orden (`transicionesOrden` en `packages/contratos/dominio.json`) solo dejaba avanzar:
registrada → en proceso → terminada → entregada, más la cancelación. La regla era "sin saltos ni retrocesos" (R9).

En la operación real se necesita corregir errores frecuentes, por ejemplo un vehículo que se pasó a "En proceso"
por equivocación o uno que vuelve al patio porque el lavado quedó mal. Con la regla anterior la única salida era
cancelar la orden y registrarla de nuevo, lo que pierde el turno y distorsiona los reportes.

## Decisión

Por ahora, una orden abierta puede **volver una sola fase**:

| Desde | Puede pasar a |
|---|---|
| Registrada | En proceso · Cancelada |
| En proceso | Terminada · **Registrada** · Cancelada |
| Terminada | Entregada · **En proceso** |
| Entregada | — (R10) |
| Cancelada | — (R10) |

- Sigue sin haber saltos: no se va de Registrada a Terminada, ni se devuelven dos fases de una vez.
- Entregada y Cancelada siguen cerradas (R10). Una orden entregada ya se cobró y no vuelve atrás.
- El cambio sigue entrando solo por `PATCH /api/ordenes-lavado/:id/estado` (R9). La API valida contra el contrato
  y queda en la auditoría.
- En el panel:
  - el menú "⋯" ofrece "Devolver a …";
  - el tablero deja arrastrar la tarjeta a la columna anterior, que muestra "Devolver aquí".

## Consecuencias

- **Una sola regla.** El contrato es la fuente de verdad: la API y el web la toman de `dominio.json`. No hace falta
  migración, porque la base solo bloquea los cambios sobre órdenes cerradas.
- **Caja.** Una orden terminada que vuelve a En proceso sale de "Por cobrar" hasta que se termine otra vez.
- **Comisiones.** La comisión cuenta toda orden no cancelada del periodo (`comision_colaborador_periodo`), así que
  devolver una fase no la cambia. Una quincena liquidada sigue protegiendo sus órdenes.
- **Temporal.** Si el negocio decide volver a la regla estricta, basta con restaurar `transicionesOrden` y estas
  pruebas.
