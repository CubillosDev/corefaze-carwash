const jornadasService = require('../../../src/services/jornadas.service');
const ordenesLavadoService = require('../../../src/services/ordenesLavado.service');
const {
  listar,
  obtenerPorId,
  abrir,
  cerrar,
  reabrir,
} = require('../../../src/controllers/jornadas.controller');

jest.mock('../../../src/services/jornadas.service');
jest.mock('../../../src/services/ordenesLavado.service');

const crearRespuesta = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const crearPeticion = ({ cuerpo = {}, parametros = {}, consulta = {} } = {}) => ({
  datos: { cuerpo, parametros, consulta },
});

describe('jornadas.controller', () => {
  describe('listar', () => {
    it('responde 200 con la lista de jornadas, cada una con unidades/ventaTotal/diferenciaCaja', () => {
      jornadasService.listarJornadas.mockReturnValue([{ id: 1 }, { id: 2 }]);
      ordenesLavadoService.obtenerTotalesDeJornada.mockReturnValue({
        unidades: 3,
        ventaTotal: 45000,
      });

      const res = crearRespuesta();
      listar(crearPeticion(), res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        jornadas: [
          { id: 1, unidades: 3, ventaTotal: 45000, diferenciaCaja: null },
          { id: 2, unidades: 3, ventaTotal: 45000, diferenciaCaja: null },
        ],
      });
    });

    it('pide los totales de cada jornada por su propio id', () => {
      jornadasService.listarJornadas.mockReturnValue([{ id: 1 }, { id: 2 }]);
      ordenesLavadoService.obtenerTotalesDeJornada.mockReturnValue({ unidades: 0, ventaTotal: 0 });

      listar(crearPeticion(), crearRespuesta(), jest.fn());

      expect(ordenesLavadoService.obtenerTotalesDeJornada).toHaveBeenCalledWith(1);
      expect(ordenesLavadoService.obtenerTotalesDeJornada).toHaveBeenCalledWith(2);
    });

    it('llama a listarJornadas con { desde, hasta } leídos de la consulta', () => {
      jornadasService.listarJornadas.mockReturnValue([]);

      listar(
        crearPeticion({ consulta: { desde: '2026-01-01', hasta: '2026-01-31' } }),
        crearRespuesta(),
        jest.fn(),
      );

      expect(jornadasService.listarJornadas).toHaveBeenCalledWith({
        desde: '2026-01-01',
        hasta: '2026-01-31',
      });
    });

    it('pasa el error al siguiente manejador si el service lanza', () => {
      const error = new Error('fallo inesperado');
      jornadasService.listarJornadas.mockImplementation(() => {
        throw error;
      });

      const next = jest.fn();
      listar(crearPeticion(), crearRespuesta(), next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('obtenerPorId', () => {
    it('responde 200 con la jornada encontrada, con unidades/ventaTotal/diferenciaCaja', () => {
      jornadasService.obtenerJornadaOFallar.mockReturnValue({ id: 1, estado: 'abierta' });
      ordenesLavadoService.obtenerTotalesDeJornada.mockReturnValue({
        unidades: 2,
        ventaTotal: 30000,
      });

      const res = crearRespuesta();
      obtenerPorId(crearPeticion({ parametros: { id: 1 } }), res, jest.fn());

      expect(ordenesLavadoService.obtenerTotalesDeJornada).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        jornada: { id: 1, estado: 'abierta', unidades: 2, ventaTotal: 30000, diferenciaCaja: null },
      });
    });

    it('no muta el objeto jornada original devuelto por el service', () => {
      const jornadaOriginal = { id: 1, estado: 'abierta' };
      jornadasService.obtenerJornadaOFallar.mockReturnValue(jornadaOriginal);
      ordenesLavadoService.obtenerTotalesDeJornada.mockReturnValue({
        unidades: 2,
        ventaTotal: 30000,
      });

      obtenerPorId(crearPeticion({ parametros: { id: 1 } }), crearRespuesta(), jest.fn());

      expect(jornadaOriginal).toEqual({ id: 1, estado: 'abierta' });
    });

    it('pasa el error al siguiente manejador si el id no existe (404)', () => {
      const error = new Error('no encontrada');
      jornadasService.obtenerJornadaOFallar.mockImplementation(() => {
        throw error;
      });

      const next = jest.fn();
      obtenerPorId(crearPeticion({ parametros: { id: 999 } }), crearRespuesta(), next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('abrir', () => {
    it('responde 201 con la jornada abierta', () => {
      jornadasService.abrirJornada.mockReturnValue({ id: 1, estado: 'abierta' });

      const res = crearRespuesta();
      abrir(crearPeticion(), res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ mensaje: 'Jornada abierta correctamente' }),
      );
    });

    it('pasa el error al siguiente manejador si ya hay una jornada abierta (409)', () => {
      const error = new Error('conflicto');
      jornadasService.abrirJornada.mockImplementation(() => {
        throw error;
      });

      const next = jest.fn();
      abrir(crearPeticion(), crearRespuesta(), next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('cerrar', () => {
    it('responde 200 con la jornada cerrada', () => {
      jornadasService.cerrarJornada.mockReturnValue({ id: 1, estado: 'cerrada' });

      const res = crearRespuesta();
      cerrar(crearPeticion({ parametros: { id: 1 } }), res, jest.fn());

      expect(jornadasService.cerrarJornada).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ mensaje: 'Jornada cerrada correctamente' }),
      );
    });

    it('pasa el error al siguiente manejador si no está abierta (409)', () => {
      const error = new Error('conflicto');
      jornadasService.cerrarJornada.mockImplementation(() => {
        throw error;
      });

      const next = jest.fn();
      cerrar(crearPeticion({ parametros: { id: 1 } }), crearRespuesta(), next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('reabrir', () => {
    it('responde 200 con la jornada reabierta', () => {
      jornadasService.reabrirJornada.mockReturnValue({ id: 1, estado: 'abierta' });

      const res = crearRespuesta();
      reabrir(crearPeticion({ parametros: { id: 1 } }), res, jest.fn());

      expect(jornadasService.reabrirJornada).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ mensaje: 'Jornada reabierta correctamente' }),
      );
    });

    it('pasa el error al siguiente manejador si no está cerrada (409)', () => {
      const error = new Error('conflicto');
      jornadasService.reabrirJornada.mockImplementation(() => {
        throw error;
      });

      const next = jest.fn();
      reabrir(crearPeticion({ parametros: { id: 1 } }), crearRespuesta(), next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
