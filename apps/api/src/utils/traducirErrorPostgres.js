const { SolicitudInvalida } = require('./errores');

/**
 * Factory para los traductores de error de Postgres (vía supabase-js) que
 * cada service define para su propio recurso. El esqueleto es idéntico en
 * los 8 services que escriben en Supabase: solo cambian los mensajes (y,
 * en algunos casos, a qué índice o constraint corresponde un mismo código
 * SQLSTATE) — por eso cada service declara solo su `mapeo`, nunca el
 * control de flujo.
 *
 * `mapeo[sqlstate]` recibe el error de Postgres y devuelve la instancia de
 * utils/errores.js correspondiente; úsalo con una función (no un valor
 * fijo) cuando el mismo código puede significar cosas distintas según el
 * índice o constraint que disparó el error — inspecciona
 * `error.message.includes(...)` para decidir, como ya hacían
 * jornadas/colaboradores/servicios/ordenesLavado para su 23505.
 *
 * 23514 (check_violation) tiene un mensaje por defecto común a los 8
 * services (`Datos de <etiqueta> inválidos`, sin detalle de campo); se
 * puede sobreescribir pasando `mapeo['23514']` si algún recurso nuevo lo
 * necesitara. Cualquier código sin entrada en `mapeo` (y distinto de
 * 23514) cae en el mensaje genérico de "Error de base de datos en
 * <tabla>", igual que el `return new Error(...)` final de cada service.
 *
 * @param {{
 *   tabla: string,
 *   etiqueta: string,
 *   mapeo?: Record<string, (error: { code: string, message: string }) => Error>,
 * }} opciones
 *   `tabla` es el nombre real de la tabla en Supabase — lo usa el mensaje
 *   genérico de fallback ("Error de base de datos en <tabla>: ...").
 *   `etiqueta` es el nombre en lenguaje natural del recurso, para el
 *   mensaje por defecto de 23514 ("Datos de <etiqueta> inválidos") — no
 *   siempre coincide con `tabla` (p. ej. tabla "ordenes_lavado", etiqueta
 *   "orden de lavado").
 * @returns {(error: { code: string, message: string }) => Error}
 */
const crearTraductorErroresPostgres =
  ({ tabla, etiqueta, mapeo = {} }) =>
  (error) => {
    if (mapeo[error.code]) {
      return mapeo[error.code](error);
    }

    if (error.code === '23514') {
      return new SolicitudInvalida([], `Datos de ${etiqueta} inválidos`);
    }

    return new Error(`Error de base de datos en ${tabla}: ${error.message}`);
  };

module.exports = { crearTraductorErroresPostgres };
