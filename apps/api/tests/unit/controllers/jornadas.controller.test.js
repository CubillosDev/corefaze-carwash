const jornadasService = require('../../../src/services/jornadas.service');
const ordenesLavadoService = require('../../../src/services/ordenesLavado.service');
const {
  listar,
  obtenerPorId,
  abrir,
  cambiarEstado,
} = require('../../../src/controllers/jornadas.controller');

jest.mock('../../../src/services/jornadas.service');
jest.mock('../../../src/services/ordenesLavado.service');

const crearRespuesta = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const crearPeticion = ({
  cuerpo = {},
  parametros = {},
  consulta = {},
  usuario = { id: 1, email: 'administrador@lavadero.com', rol: 'administrador' },
} = {}) => ({
  datos: { cuerpo, parametros, consulta },
  usuario,
});

describe('jornadas.controller', () => {
  describe('listar', () => {
    it('responde 200 con la lista de jornadas, cada una con unidades/ventaTotal/diferenciaCaja', async () => {
      jornadasService.listarJornadas.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      ordenesLavadoService.obtenerTotalesDeJornada.mockReturnValue({
        unidades: 3,
        ventaTotal: 45000,
      });

      const res = crearRespuesta();
      await listar(crearPeticion(), res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        jornadas: [
          { id: 1, unidades: 3, ventaTotal: 45000, diferenciaCaja: null },
          { id: 2, unidades: 3, ventaTotal: 45000, diferenciaCaja: null },
        ],
      });
    });

    it('pide los totales de cada jornada por su propio id', async () => {
      jornadasService.listarJornadas.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      ordenesLavadoService.obtenerTotalesDeJornada.mockReturnValue({ unidades: 0, ventaTotal: 0 });

      await listar(crearPeticion(), crearRespuesta(), jest.fn());

      expect(ordenesLavadoService.obtenerTotalesDeJornada).toHaveBeenCalledWith(1);
      expect(ordenesLavadoService.obtenerTotalesDeJornada).toHaveBeenCalledWith(2);
    });

    it('llama a listarJornadas con { desde, hasta } leídos de la consulta', async () => {
      jornadasService.listarJornadas.mockResolvedValue([]);

      await listar(
        crearPeticion({ consulta: { desde: '2026-01-01', hasta: '2026-01-31' } }),
        crearRespuesta(),
        jest.fn(),
      );

      expect(jornadasService.listarJornadas).toHaveBeenCalledWith({
        desde: '2026-01-01',
        hasta: '2026-01-31',
      });
    });

    it('propaga el error si el service lanza — sin try/catch, Express 5 lo atrapa solo', async () => {
      const error = new Error('fallo inesperado');
      jornadasService.listarJornadas.mockRejectedValue(error);

      await expect(listar(crearPeticion(), crearRespuesta(), jest.fn())).rejects.toThrow(error);
    });
  });

  describe('obtenerPorId', () => {
    it('responde 200 con la jornada encontrada, con unidades/ventaTotal/diferenciaCaja', async () => {
      jornadasService.obtenerJornadaOFallar.mockResolvedValue({ id: 1, estado: 'abierta' });
      ordenesLavadoService.obtenerTotalesDeJornada.mockReturnValue({
        unidades: 2,
        ventaTotal: 30000,
      });

      const res = crearRespuesta();
      await obtenerPorId(crearPeticion({ parametros: { id: 1 } }), res, jest.fn());

      expect(ordenesLavadoService.obtenerTotalesDeJornada).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        jornada: { id: 1, estado: 'abierta', unidades: 2, ventaTotal: 30000, diferenciaCaja: null },
      });
    });

    it('no muta el objeto jornada original devuelto por el service', async () => {
      const jornadaOriginal = { id: 1, estado: 'abierta' };
      jornadasService.obtenerJornadaOFallar.mockResolvedValue(jornadaOriginal);
      ordenesLavadoService.obtenerTotalesDeJornada.mockReturnValue({
        unidades: 2,
        ventaTotal: 30000,
      });

      await obtenerPorId(crearPeticion({ parametros: { id: 1 } }), crearRespuesta(), jest.fn());

      expect(jornadaOriginal).toEqual({ id: 1, estado: 'abierta' });
    });

    it('propaga el error si el id no existe (404)', async () => {
      const error = new Error('no encontrada');
      jornadasService.obtenerJornadaOFallar.mockRejectedValue(error);

      await expect(
        obtenerPorId(crearPeticion({ parametros: { id: 999 } }), crearRespuesta(), jest.fn()),
      ).rejects.toThrow(error);
    });
  });

  describe('abrir', () => {
    it('responde 201 con la jornada abierta', async () => {
      jornadasService.abrirJornada.mockResolvedValue({ id: 1, estado: 'abierta' });

      const res = crearRespuesta();
      await abrir(crearPeticion(), res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ mensaje: 'Jornada abierta correctamente' }),
      );
    });

    it('abre la jornada con el id del usuario autenticado (SCRUM-152: antes era su email)', async () => {
      jornadasService.abrirJornada.mockResolvedValue({ id: 1, estado: 'abierta' });

      await abrir(
        crearPeticion({ usuario: { id: 7, email: 'soporte@lavadero.com', rol: 'soporte' } }),
        crearRespuesta(),
        jest.fn(),
      );

      expect(jornadasService.abrirJornada).toHaveBeenCalledWith(7);
    });

    it('propaga el error si ya hay una jornada abierta (409)', async () => {
      const error = new Error('conflicto');
      jornadasService.abrirJornada.mockRejectedValue(error);

      await expect(abrir(crearPeticion(), crearRespuesta(), jest.fn())).rejects.toThrow(error);
    });
  });

  describe('cambiarEstado', () => {
    it('estado "cerrada": despacha a cerrarJornada (con el id del usuario) y responde 200', async () => {
      jornadasService.cerrarJornada.mockResolvedValue({ id: 1, estado: 'cerrada' });

      const res = crearRespuesta();
      await cambiarEstado(
        crearPeticion({
          parametros: { id: 1 },
          cuerpo: { estado: 'cerrada' },
          usuario: { id: 1, email: 'administrador@lavadero.com', rol: 'administrador' },
        }),
        res,
        jest.fn(),
      );

      expect(jornadasService.cerrarJornada).toHaveBeenCalledWith(1, 1);
      expect(jornadasService.reabrirJornada).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ mensaje: 'Jornada cerrada correctamente' }),
      );
    });

    it('propaga el error si no está abierta (409)', async () => {
      const error = new Error('conflicto');
      jornadasService.cerrarJornada.mockRejectedValue(error);

      await expect(
        cambiarEstado(
          crearPeticion({ parametros: { id: 1 }, cuerpo: { estado: 'cerrada' } }),
          crearRespuesta(),
          jest.fn(),
        ),
      ).rejects.toThrow(error);
    });

    it('estado "abierta": despacha a reabrirJornada (con el id del usuario) y responde 200', async () => {
      jornadasService.reabrirJornada.mockResolvedValue({ id: 1, estado: 'abierta' });

      const res = crearRespuesta();
      await cambiarEstado(
        crearPeticion({
          parametros: { id: 1 },
          cuerpo: { estado: 'abierta' },
          usuario: { id: 1, email: 'administrador@lavadero.com', rol: 'administrador' },
        }),
        res,
        jest.fn(),
      );

      expect(jornadasService.reabrirJornada).toHaveBeenCalledWith(1, 1);
      expect(jornadasService.cerrarJornada).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ mensaje: 'Jornada reabierta correctamente' }),
      );
    });

    it('propaga el error si no está cerrada (409)', async () => {
      const error = new Error('conflicto');
      jornadasService.reabrirJornada.mockRejectedValue(error);

      await expect(
        cambiarEstado(
          crearPeticion({ parametros: { id: 1 }, cuerpo: { estado: 'abierta' } }),
          crearRespuesta(),
          jest.fn(),
        ),
      ).rejects.toThrow(error);
    });
  });
});
