/**
 * "Tabla" de jornadas en memoria (equivalente a la futura tabla `jornadas`
 * de Supabase, Bloque 10). Empieza vacía: se abre la primera a través de
 * POST /api/jornadas.
 *
 * `fecha` es única por jornada (una fila por día calendario; reabrir
 * reutiliza la misma fila, nunca crea una segunda para la misma fecha).
 * `abiertaPor`/`cerradaPor` quedan en null por ahora: esta ruta solo exige
 * API Key, no JWT, así que todavía no hay un usuario autenticado que
 * registrar aquí. `reaperturas` crece una entrada por cada vez que la
 * jornada se reabre, como auditoría mínima de ese evento.
 *
 * @type {Array<{ id: number, fecha: string, estado: string, abiertaEn: string, abiertaPor: number|null, cerradaEn: string|null, cerradaPor: number|null, reaperturas: Array<{ en: string }> }>}
 */
const jornadas = [];

module.exports = jornadas;
