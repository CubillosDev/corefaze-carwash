// supabase/config.toml fija max_rows=1000: cualquier select sin .range()
// explícito se trunca ahí en silencio. TAMANO_PAGINA_AGREGADO usa ese
// mismo tope como tamaño de página en traerTodasLasFilas, para que un
// agregado (suma, conteo, lista completa) nunca pierda filas más allá de
// la 1000 sin necesitar una vista o función nueva en Postgres.
const TAMANO_PAGINA_AGREGADO = 1000;

/**
 * Pagina por rangos una consulta Postgrest hasta agotarla, para no
 * depender del límite implícito de max_rows=1000 (ver TAMANO_PAGINA_AGREGADO).
 * `construirPagina(desde, hasta)` debe devolver la consulta ya filtrada,
 * encadenando `.range(desde, hasta)` al final.
 *
 * @param {(desde: number, hasta: number) => PromiseLike<{ data: object[], error: object|null }>} construirPagina
 * @returns {Promise<object[]>}
 */
const traerTodasLasFilas = async (construirPagina) => {
  const filas = [];
  let desde = 0;

  for (;;) {
    const hasta = desde + TAMANO_PAGINA_AGREGADO - 1;
    const { data, error } = await construirPagina(desde, hasta);

    if (error) {
      throw error;
    }

    filas.push(...data);

    if (data.length < TAMANO_PAGINA_AGREGADO) {
      return filas;
    }
    desde += TAMANO_PAGINA_AGREGADO;
  }
};

/** Parte un arreglo en trozos de tamaño `tamano`, para un .in(...) que podría superar max_rows. */
const trocear = (arreglo, tamano) => {
  const trozos = [];
  for (let i = 0; i < arreglo.length; i += tamano) {
    trozos.push(arreglo.slice(i, i + tamano));
  }
  return trozos;
};

module.exports = { TAMANO_PAGINA_AGREGADO, traerTodasLasFilas, trocear };
