/**
 * "Tabla" de clientes en memoria (equivalente a la futura tabla `clientes`
 * de Supabase, Bloque 10). Empieza vacía: los clientes se crean a través de
 * POST /api/clientes.
 *
 * @type {Array<{ id: number, nombre: string, documento: string, tipo: string, telefono: string, email: string|null, creditoHabilitado: boolean, estado: string }>}
 */
const clientes = [];

module.exports = clientes;
