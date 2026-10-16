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

const crearPeticion = ({ cuerpo = {}, parametros = {} } = {}) => ({
  datos: { cuerpo, parametros },
});

describe('colaboradores.controller', () => {
  describe('listar', () => {
    it('responde 200 con la lista de colaboradores', () => {
      colaboradoresService.listarColaboradores.mockReturnValue([{ id: 1 }, { id: 2 }]);

      const res = crearRespuesta();
      listar(crearPeticion(), res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ colaboradores: [{ id: 1 }, { id: 2 }] });
    });

    it('pasa el error al siguiente manejador si el service lanza', () => {
      const error = new Error('fallo inesperado');
      colaboradoresService.listarColaboradores.mockImplementation(() => {
        throw error;
      });

      const next = jest.fn();
      listar(crearPeticion(), crearRespuesta(), next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('obtenerPorId', () => {
    it('responde 200 con el colaborador encontrado', () => {
      colaboradoresService.obtenerColaboradorOFallar.mockReturnValue({ id: 1, nombre: 'Juan' });

      const res = crearRespuesta();
      obtenerPorId(crearPeticion({ parametros: { id: 1 } }), res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ colaborador: { id: 1, nombre: 'Juan' } });
    });

    it('pasa el error al siguiente manejador si el id no existe (404)', () => {
      const error = new Error('no encontrado');
      colaboradoresService.obtenerColaboradorOFallar.mockImplementation(() => {
        throw error;
      });

      const next = jest.fn();
      obtenerPorId(crearPeticion({ parametros: { id: 999 } }), crearRespuesta(), next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('crear', () => {
    it('responde 201 con el colaborador creado', () => {
      const datosColaborador = {
        codigo: 401,
        nombre: 'Juan Pérez',
        documento: '1020304050',
        telefono: '3001234567',
        porcentajeComision: 0.15,
        tipoVinculacion: 'fijo',
      };
      colaboradoresService.crearColaborador.mockReturnValue({ id: 1, ...datosColaborador });

      const res = crearRespuesta();
      crear(crearPeticion({ cuerpo: datosColaborador }), res, jest.fn());

      expect(colaboradoresService.crearColaborador).toHaveBeenCalledWith(datosColaborador);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ mensaje: 'Colaborador registrado correctamente' }),
      );
    });

    it('pasa el error al siguiente manejador si el código ya está ocupado (409)', () => {
      const error = new Error('código ocupado');
      colaboradoresService.crearColaborador.mockImplementation(() => {
        throw error;
      });

      const next = jest.fn();
      crear(crearPeticion({ cuerpo: {} }), crearRespuesta(), next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('actualizar', () => {
    it('responde 200 con el colaborador actualizado', () => {
      colaboradoresService.actualizarColaborador.mockReturnValue({
        id: 1,
        telefono: '3009999999',
      });

      const res = crearRespuesta();
      actualizar(
        crearPeticion({ parametros: { id: 1 }, cuerpo: { telefono: '3009999999' } }),
        res,
        jest.fn(),
      );

      expect(colaboradoresService.actualizarColaborador).toHaveBeenCalledWith(1, {
        telefono: '3009999999',
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ mensaje: 'Colaborador actualizado correctamente' }),
      );
    });

    it('pasa el error al siguiente manejador si el id no existe (404)', () => {
      const error = new Error('no encontrado');
      colaboradoresService.actualizarColaborador.mockImplementation(() => {
        throw error;
      });

      const next = jest.fn();
      actualizar(crearPeticion({ parametros: { id: 999 } }), crearRespuesta(), next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('cambiarEstado', () => {
    it('responde 200 con el colaborador con el estado actualizado', () => {
      colaboradoresService.cambiarEstadoColaborador.mockReturnValue({
        id: 1,
        estado: 'inactivo',
      });

      const res = crearRespuesta();
      cambiarEstado(
        crearPeticion({ parametros: { id: 1 }, cuerpo: { estado: 'inactivo' } }),
        res,
        jest.fn(),
      );

      expect(colaboradoresService.cambiarEstadoColaborador).toHaveBeenCalledWith(1, 'inactivo');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ mensaje: 'Estado del colaborador actualizado correctamente' }),
      );
    });

    it('pasa el error al siguiente manejador si el id no existe (404)', () => {
      const error = new Error('no encontrado');
      colaboradoresService.cambiarEstadoColaborador.mockImplementation(() => {
        throw error;
      });

      const next = jest.fn();
      cambiarEstado(
        crearPeticion({ parametros: { id: 999 }, cuerpo: { estado: 'activo' } }),
        crearRespuesta(),
        next,
      );

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('eliminar', () => {
    it('responde 200 al eliminar correctamente', () => {
      ordenesLavadoService.colaboradorTieneOrdenes.mockReturnValue(false);

      const res = crearRespuesta();
      eliminar(crearPeticion({ parametros: { id: 1 } }), res, jest.fn());

      expect(colaboradoresService.eliminarColaborador).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'Colaborador eliminado correctamente' });
    });

    it('pasa el error al siguiente manejador si el id no existe (404)', () => {
      ordenesLavadoService.colaboradorTieneOrdenes.mockReturnValue(false);
      const error = new Error('no encontrado');
      colaboradoresService.eliminarColaborador.mockImplementation(() => {
        throw error;
      });

      const next = jest.fn();
      eliminar(crearPeticion({ parametros: { id: 999 } }), crearRespuesta(), next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('responde 409 si el colaborador tiene órdenes de lavado asociadas y no elimina', () => {
      ordenesLavadoService.colaboradorTieneOrdenes.mockReturnValue(true);

      const next = jest.fn();
      eliminar(crearPeticion({ parametros: { id: 1 } }), crearRespuesta(), next);

      const [error] = next.mock.calls[0];
      expect(error.estado).toBe(409);
      expect(colaboradoresService.eliminarColaborador).not.toHaveBeenCalled();
    });
  });
});
