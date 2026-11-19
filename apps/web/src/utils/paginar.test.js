import { describe, expect, it } from 'vitest';

import { paginar, rangoDePaginas } from '@/utils/paginar';

describe('paginar', () => {
  const numeros = Array.from({ length: 23 }, (_, indice) => indice + 1);

  it('devuelve la página pedida y el total de páginas', () => {
    expect(paginar(numeros, 1, 10)).toEqual({
      elementos: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
      pagina: 1,
      totalPaginas: 3,
    });
  });

  it('ajusta una página que se pasa del final o es negativa', () => {
    expect(paginar(numeros, 9, 10).pagina).toBe(2);
    expect(paginar(numeros, -1, 10).pagina).toBe(0);
  });

  it('una lista vacía tiene una sola página vacía', () => {
    expect(paginar([], 0, 10)).toEqual({ elementos: [], pagina: 0, totalPaginas: 1 });
  });
});

describe('rangoDePaginas', () => {
  it('muestra todas las páginas cuando son pocas', () => {
    expect(rangoDePaginas(0, 4)).toEqual([0, 1, 2, 3]);
  });

  it('pone huecos entre la primera, las vecinas de la actual y la última', () => {
    expect(rangoDePaginas(5, 12)).toEqual([0, null, 4, 5, 6, null, 11]);
  });

  it('no deja hueco junto a los extremos', () => {
    expect(rangoDePaginas(0, 12)).toEqual([0, 1, null, 11]);
    expect(rangoDePaginas(11, 12)).toEqual([0, null, 10, 11]);
  });
});
