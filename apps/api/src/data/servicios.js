/**
 * "Tabla" de servicios en memoria (equivalente a la futura tabla
 * `servicios` de Supabase, Bloque 10). Empieza vacía: se crean a través
 * de POST /api/servicios.
 *
 * `numero` es el identificador del catálogo que usan las reglas de
 * negocio del dominio compartido (ej. SERVICIOS_CON_LAVADO_MOTOR),
 * distinto del `id` interno de la tabla. `tarifas` define el valor del
 * servicio por cada tipo de vehículo que atiende; un tipo de vehículo
 * ausente en el arreglo significa que el servicio no aplica a ese tipo.
 *
 * @type {Array<{ id: number, numero: number, nombre: string, descripcion: string, categoria: string, tarifas: Array<{ tipoVehiculo: string, valor: number }>, activo: boolean }>}
 */
const servicios = [];

module.exports = servicios;
