/**
 * Corta una lista en páginas para mostrarla. La API todavía no pagina, así que
 * el panel recibe la lista completa y solo decide qué parte dibujar.
 *
 * @template T
 * @param {T[]} elementos
 * @param {number} pagina Índice pedido, desde 0. Si se pasa del final se ajusta.
 * @param {number} porPagina
 * @returns {{ elementos: T[], pagina: number, totalPaginas: number }}
 */
export function paginar(elementos, pagina, porPagina) {
  const totalPaginas = Math.max(1, Math.ceil(elementos.length / porPagina));
  const paginaValida = Math.min(Math.max(0, pagina), totalPaginas - 1);
  const inicio = paginaValida * porPagina;

  return {
    elementos: elementos.slice(inicio, inicio + porPagina),
    pagina: paginaValida,
    totalPaginas,
  };
}

/**
 * Números de página que se muestran en la paginación, con `null` donde va un
 * "…". Siempre incluye la primera, la última y las vecinas de la actual.
 *
 * @param {number} pagina Actual, desde 0.
 * @param {number} totalPaginas
 * @returns {(number|null)[]}
 */
export function rangoDePaginas(pagina, totalPaginas) {
  if (totalPaginas <= 7) {
    return Array.from({ length: totalPaginas }, (_, indice) => indice);
  }

  const visibles = new Set([0, totalPaginas - 1, pagina - 1, pagina, pagina + 1]);
  const ordenadas = [...visibles].filter((valor) => valor >= 0 && valor < totalPaginas).sort((a, b) => a - b);

  return ordenadas.flatMap((valor, indice) =>
    indice > 0 && valor - ordenadas[indice - 1] > 1 ? [null, valor] : [valor],
  );
}
