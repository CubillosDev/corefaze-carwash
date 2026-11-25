const { crearRegistroTrazabilidad, percentil, RUTA_OTRAS } = require('../../../src/services/trazabilidad.service');

describe('percentil', () => {
  it('usa el rango más cercano', () => {
    const valores = [5, 1, 4, 2, 3, 10, 9, 8, 7, 6];
    expect(percentil(valores, 50)).toBe(5);
    expect(percentil(valores, 95)).toBe(10);
  });

  it('devuelve 0 sin valores', () => {
    expect(percentil([], 95)).toBe(0);
  });
});

describe('registro de trazabilidad', () => {
  it('calcula promedio, mínimo, máximo y ordena de la ruta más lenta a la más rápida', () => {
    const registro = crearRegistroTrazabilidad();
    registro.registrar({ ruta: 'GET /api/rapida', estado: 200, milisegundos: 2 });
    registro.registrar({ ruta: 'GET /api/lenta', estado: 200, milisegundos: 10 });
    registro.registrar({ ruta: 'GET /api/lenta', estado: 200, milisegundos: 30 });

    const { totalPeticiones, rutas } = registro.resumen();
    expect(totalPeticiones).toBe(3);
    expect(rutas[0]).toMatchObject({ ruta: 'GET /api/lenta', peticiones: 2, promedioMs: 20, minimoMs: 10, maximoMs: 30 });
    expect(rutas[1].ruta).toBe('GET /api/rapida');
  });

  it('limita la cantidad de rutas distintas y agrupa el resto', () => {
    const registro = crearRegistroTrazabilidad({ maximoDeRutas: 2 });
    ['a', 'b', 'c', 'd'].forEach((letra) => registro.registrar({ ruta: `GET /api/${letra}`, estado: 200, milisegundos: 1 }));

    const { rutas } = registro.resumen();
    expect(rutas).toHaveLength(3);
    expect(rutas.find((fila) => fila.ruta === RUTA_OTRAS).peticiones).toBe(2);
  });

  it('reiniciar borra las métricas', () => {
    const registro = crearRegistroTrazabilidad();
    registro.registrar({ ruta: 'GET /api/x', estado: 200, milisegundos: 1 });
    registro.reiniciar();
    expect(registro.resumen()).toMatchObject({ totalPeticiones: 0, rutas: [] });
  });
});
