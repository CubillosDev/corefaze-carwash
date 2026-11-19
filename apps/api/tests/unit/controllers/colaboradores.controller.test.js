const colaboradoresService = require('../../../src/services/colaboradores.service');
const ordenesLavadoService = require('../../../src/services/ordenesLavado.service');
const {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  cambiarEstado,
  eliminar,
} = require('../../../src/controllers/colaboradores.controller');

jest.mock('../../../src/services/colaboradores.service');
jest.mock('../../../src/services/ordenesLavado.service');

const crearRespuesta = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// usuario: req.usuario ya existe siempre aquí (autenticarJWT corre antes
// en la ruta real); colaboradores.controller.js lo usa para la auditoría.
const crearPeticion = ({ cuerpo = {}, parametros = {}, usuario = { id: 1 } } = {}) => ({
  datos: { cuerpo, parametros },
  usuario,
});

describe('colaboradores.controller', () => {
  describe('listar', () => {
    it('responde 200 con la lista de colaboradores', async () => {
      colaboradoresService.listarColaboradores.mockResolvedValue([{ id: 1 }, { id: 2 }]);

      const res = crearRespuesta();
      await listar(crearPeticion(), res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ colaboradores: [{ id: 1 }, { id: 2 }] });
    });
  });

  describe('obtenerPorId', () => {
    it('responde 200 con el colaborador encontrado', async () => {
      colaboradoresService.obtenerColaboradorOFallar.mockResolvedValue({ id: 1, nombre: 'Juan' });

      const res = crearRespuesta();
      await obtenerPorId(crearPeticion({ parametros: { id: 1 } }), res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ colaborador: { id: 1, nombre: 'Juan' } });
    });

    it('propaga el error si el id no existe (404) — sin try/catch, Express 5 lo atrapa solo', async () => {
      const error = new Error('no encontrado');
      colaboradoresService.obtenerColaboradorOFallar.mockRejectedValue(error);

      await expect(
        obtenerPorId(crearPeticion({ parametros: { id: 999 } }), crearRespuesta(), jest.fn()),
      ).rejects.toThrow(error);
    });
  });

  describe('crear', () => {
    it('responde 201 con el colaborador creado, pasando el usuario autenticado para la auditoría', async () => {
      const datosColaborador = {
        codigo: 401,
        nombre: 'Juan Pérez',
        documento: '1020304050',
        telefono: '3001234567',
        porcentajeComision: 0.15,
        tipoVinculacion: 'fijo',
      };
      colaboradoresService.crearColaborador.mockResolvedValue({ id: 1, ...datosColaborador });

      const res = crearRespuesta();
      await crear(crearPeticion({ cuerpo: datosColaborador, usuario: { id: 7 } }), res, jest.fn());

      expect(colaboradoresService.crearColaborador).toHaveBeenCalledWith(datosColaborador, 7);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ mensaje: 'Colaborador registrado correctamente' }),
      );
    });

    it('propaga el error si el código ya está ocupado (409)', async () => {
      const error = new Error('código ocupado');
      colaboradoresService.crearColaborador.mockRejectedValue(error);

      await expect(
        crear(crearPeticion({ cuerpo: {} }), crearRespuesta(), jest.fn()),
      ).rejects.toThrow(error);
    });
  });

  describe('actualizar', () => {
    it('responde 200 con el colaborador actualizado', async () => {
      colaboradoresService.actualizarColaborador.mockResolvedValue({
        id: 1,
        telefono: '3009999999',
      });

      const res = crearRespuesta();
      await actualizar(
        crearPeticion({
          parametros: { id: 1 },
          cuerpo: { telefono: '3009999999' },
          usuario: { id: 7 },
        }),
        res,
        jest.fn(),
      );

      expect(colaboradoresService.actualizarColaborador).toHaveBeenCalledWith(
        1,
        { telefono: '3009999999' },
        7,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ mensaje: 'Colaborador actualizado correctamente' }),
      );
    });

    it('propaga el error si el id no existe (404)', async () => {
      const error = new Error('no encontrado');
      colaboradoresService.actualizarColaborador.mockRejectedValue(error);

      await expect(
        actualizar(crearPeticion({ parametros: { id: 999 } }), crearRespuesta(), jest.fn()),
      ).rejects.toThrow(error);
    });
  });

  describe('cambiarEstado', () => {
    it('responde 200 con el colaborador con el estado actualizado', async () => {
      colaboradoresService.cambiarEstadoColaborador.mockResolvedValue({
        id: 1,
        estado: 'inactivo',
      });

      const res = crearRespuesta();
      await cambiarEstado(
        crearPeticion({
          parametros: { id: 1 },
          cuerpo: { estado: 'inactivo' },
          usuario: { id: 7 },
        }),
        res,
        jest.fn(),
      );

      expect(colaboradoresService.cambiarEstadoColaborador).toHaveBeenCalledWith(1, 'inactivo', 7);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ mensaje: 'Estado del colaborador actualizado correctamente' }),
      );
    });

    it('propaga el error si el id no existe (404)', async () => {
      const error = new Error('no encontrado');
      colaboradoresService.cambiarEstadoColaborador.mockRejectedValue(error);

      await expect(
        cambiarEstado(
          crearPeticion({ parametros: { id: 999 }, cuerpo: { estado: 'activo' } }),
          crearRespuesta(),
          jest.fn(),
        ),
      ).rejects.toThrow(error);
    });
  });

  describe('eliminar', () => {
    it('responde 200 al eliminar correctamente', async () => {
      ordenesLavadoService.colaboradorTieneOrdenes.mockReturnValue(false);
      colaboradoresService.eliminarColaborador.mockResolvedValue(undefined);

      const res = crearRespuesta();
      await eliminar(crearPeticion({ parametros: { id: 1 }, usuario: { id: 7 } }), res, jest.fn());

      expect(colaboradoresService.eliminarColaborador).toHaveBeenCalledWith(1, 7);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'Colaborador eliminado correctamente' });
    });

    it('propaga el error si el id no existe (404)', async () => {
      ordenesLavadoService.colaboradorTieneOrdenes.mockReturnValue(false);
      const error = new Error('no encontrado');
      colaboradoresService.eliminarColaborador.mockRejectedValue(error);

      await expect(
        eliminar(crearPeticion({ parametros: { id: 999 } }), crearRespuesta(), jest.fn()),
      ).rejects.toThrow(error);
    });

    it('responde 409 si el colaborador tiene órdenes de lavado asociadas, sin llamar a eliminarColaborador', async () => {
      ordenesLavadoService.colaboradorTieneOrdenes.mockReturnValue(true);

      await expect(
        eliminar(crearPeticion({ parametros: { id: 1 } }), crearRespuesta(), jest.fn()),
      ).rejects.toMatchObject({ estado: 409 });
      expect(colaboradoresService.eliminarColaborador).not.toHaveBeenCalled();
    });
  });
});
