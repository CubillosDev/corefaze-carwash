/**
 * "Tabla" de vehículos en memoria (equivalente a la futura tabla `vehiculos`
 * de Supabase, Bloque 10). Empieza vacía: los vehículos se crean a través de
 * POST /api/vehiculos.
 *
 * @type {Array<{ id: number, placa: string, tipo: string, marca: string|null, color: string|null, clienteId: number }>}
 */
const vehiculos = [];

module.exports = vehiculos;
