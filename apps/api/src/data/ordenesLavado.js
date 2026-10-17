/**
 * "Tabla" de órdenes de lavado en memoria (equivalente a la futura tabla
 * `ordenes_lavado` de Supabase, Bloque 10). Empieza vacía: se crean a
 * través de POST /api/ordenes-lavado.
 *
 * Es un registro auditable: nunca se elimina con DELETE. Se puede editar
 * (PATCH /:id) mientras esté abierta y su jornada siga abierta, cambiar
 * de estado (PATCH /:id/estado) según la máquina de estados de
 * TRANSICIONES_ORDEN, y cancelarse con un motivo obligatorio.
 *
 * `jornadaId` amarra la orden a la jornada que estaba abierta al
 * crearla; `fecha` es la de esa jornada (`jornada.fecha`), nunca la
 * envía el cliente. `creadaEn` guarda el timestamp exacto (la fecha sola
 * no alcanza para mostrar la hora en la planilla del día). `clienteId`
 * solo tiene valor cuando `medioPago` es "credito"; en cualquier otro
 * medio de pago queda en null. `valor` siempre proviene de la tarifa del
 * servicio para el tipo de vehículo, nunca del cliente de la API.
 * `motivo` solo se llena al cancelar.
 *
 * @type {Array<{ id: number, jornadaId: number, fecha: string, turno: number, vehiculoId: number, servicioId: number, colaboradorId: number, valor: number, medioPago: string, clienteId: number|null, autorizaMotor: boolean, observaciones: string|null, motivo: string|null, estado: string, creadaEn: string }>}
 */
const ordenesLavado = [];

module.exports = ordenesLavado;
