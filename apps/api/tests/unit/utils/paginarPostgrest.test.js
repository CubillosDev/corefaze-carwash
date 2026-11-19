const {
  TAMANO_PAGINA_AGREGADO,
  traerTodasLasFilas,
  trocear,
} = require('../../../src/utils/paginarPostgrest');

describe('paginarPostgrest', () => {
  describe('traerTodasLasFilas', () => {
    it('devuelve todas las filas cuando caben en una sola página', async () => {
      const construirPagina = jest.fn(() =>
        Promise.resolve({ data: [{ id: 1 }, { id: 2 }], error: null }),
      );

      const filas = await traerTodasLasFilas(construirPagina);

      expect(filas).toEqual([{ id: 1 }, { id: 2 }]);
      expect(construirPagina).toHaveBeenCalledTimes(1);
      expect(construirPagina).toHaveBeenCalledWith(0, TAMANO_PAGINA_AGREGADO - 1);
    });

    it('pide una segunda página cuando la primera viene exactamente llena (no trunca en 1000)', async () => {
      const primeraPagina = Array.from({ length: TAMANO_PAGINA_AGREGADO }, (_, i) => ({ id: i }));
      const segundaPagina = [{ id: TAMANO_PAGINA_AGREGADO }];
      const construirPagina = jest
        .fn()
        .mockResolvedValueOnce({ data: primeraPagina, error: null })
        .mockResolvedValueOnce({ data: segundaPagina, error: null });

      const filas = await traerTodasLasFilas(construirPagina);

      expect(filas).toHaveLength(TAMANO_PAGINA_AGREGADO + 1);
      expect(construirPagina).toHaveBeenCalledTimes(2);
      expect(construirPagina).toHaveBeenNthCalledWith(
        2,
        TAMANO_PAGINA_AGREGADO,
        2 * TAMANO_PAGINA_AGREGADO - 1,
      );
    });

    it('devuelve un arreglo vacío si la primera página ya viene vacía', async () => {
      const construirPagina = jest.fn(() => Promise.resolve({ data: [], error: null }));
      await expect(traerTodasLasFilas(construirPagina)).resolves.toEqual([]);
    });

    it('propaga el error de una página', async () => {
      const error = new Error('falló la consulta');
      const construirPagina = jest.fn(() => Promise.resolve({ data: null, error }));
      await expect(traerTodasLasFilas(construirPagina)).rejects.toBe(error);
    });
  });

  describe('trocear', () => {
    it('parte un arreglo en trozos del tamaño pedido', () => {
      expect(trocear([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('devuelve un solo trozo si el arreglo ya cabe en el tamaño pedido', () => {
      expect(trocear([1, 2], 10)).toEqual([[1, 2]]);
    });

    it('devuelve un arreglo vacío para un arreglo vacío', () => {
      expect(trocear([], 10)).toEqual([]);
    });
  });
});
