/**
 * "Tabla" de usuarios en memoria (equivalente a la futura tabla `usuarios`
 * de Supabase, Bloque 10). Empieza vacía a propósito: el primer usuario se
 * crea a través de POST /api/auth/registro, nunca hardcodeado aquí.
 *
 * Se reinicia cada vez que el servidor se reinicia (Parte 21 del laboratorio).
 *
 * @type {Array<{ id: number, nombre: string, email: string, passwordHash: string, rol: string, activo: boolean }>}
 */
const usuarios = [];

module.exports = usuarios;
