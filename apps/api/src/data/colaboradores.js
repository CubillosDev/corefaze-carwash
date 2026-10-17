/**
 * "Tabla" de colaboradores en memoria (equivalente a la futura tabla
 * `colaboradores` de Supabase, Bloque 10). Empieza vacía: se crean a través
 * de POST /api/colaboradores.
 *
 * `inactivoDesde` queda null mientras el colaborador está activo; se fija
 * al momento exacto en que pasa a inactivo, y es la base del período de
 * gracia que protege su código antes de poder reasignarlo a otra persona.
 *
 * @type {Array<{ id: number, codigo: number, nombre: string, documento: string, telefono: string, porcentajeComision: number, tipoVinculacion: string, estado: string, inactivoDesde: string|null }>}
 */
const colaboradores = [];

module.exports = colaboradores;
