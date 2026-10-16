/**
 * "Tabla" de órdenes de lavado en memoria (equivalente a la futura tabla
 * `ordenes_lavado` de Supabase, Bloque 10). Empieza vacía: se crean a
 * través de POST /api/ordenes-lavado.
 *
 * Es un registro auditable: nunca se edita con PUT ni se elimina con
 * DELETE, solo se crea y cambia de estado (PATCH) según la máquina de
 * estados de TRANSICIONES_ORDEN.
 *
 * `clienteId` solo tiene valor cuando `medioPago` es "credito"; en
 * cualquier otro medio de pago queda en null. `valor` siempre proviene
 * de la tarifa del servicio para el tipo de vehículo, nunca del cliente
 * de la API.
 *
 * @type {Array<{ id: number, fecha: string, turno: number, vehiculoId: number, servicioId: number, colaboradorId: number, valor: number, medioPago: string, clienteId: number|null, autorizaMotor: boolean, observaciones: string|null, estado: string }>}
 */
const ordenesLavado = [];

module.exports = ordenesLavado;
