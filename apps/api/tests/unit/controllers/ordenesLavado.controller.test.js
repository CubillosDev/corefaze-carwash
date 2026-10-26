const ordenesLavadoService = require('../../../src/services/ordenesLavado.service');
const {
  listar,
  obtenerPorId,
  crear,
  editar,
  cambiarEstado,
} = require('../../../src/controllers/ordenesLavado.controller');

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

describe('ordenesLavado.controller', () => {
  describe('listar', () => {
    it('responde 200 con la lista de órdenes y sus totales', () => {
      const ordenes = [{ id: 1 }, { id: 2 }];
      const totales = { cantidadServicios: 2, totalGeneral: 30000, totalesPorMedioPago: {} };
      ordenesLavadoService.listarOrdenes.mockReturnValue(ordenes);
      ordenesLavadoService.calcularTotales.mockReturnValue(totales);

      const res = crearRespuesta();
      listar(crearPeticion(), res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ ordenes, totales });
    });

    it('calcula los totales sobre exactamente el mismo arreglo que devuelve en "ordenes"', () => {
      const ordenes = [{ id: 1 }, { id: 2 }, { id: 3 }];
      ordenesLavadoService.listarOrdenes.mockReturnValue(ordenes);
      ordenesLavadoService.calcularTotales.mockReturnValue({});

      listar(crearPeticion(), crearRespuesta(), jest.fn());

      expect(ordenesLavadoService.calcularTotales).toHaveBeenCalledWith(ordenes);
    });

    it('llama a listarOrdenes con todos los filtros en undefined cuando no hay query', () => {
      ordenesLavadoService.listarOrdenes.mockReturnValue([]);
      ordenesLavadoService.calcularTotales.mockReturnValue({});

      listar(crearPeticion(), crearRespuesta(), jest.fn());

      expect(ordenesLavadoService.listarOrdenes).toHaveBeenCalledWith({
        fecha: undefined,
        colaboradorId: undefined,
        servicioId: undefined,
        medioPago: undefined,
        jornadaId: undefined,
      });
    });

    it('llama a listarOrdenes con los filtros que sí vienen en la query', () => {
      ordenesLavadoService.listarOrdenes.mockReturnValue([]);
      ordenesLavadoService.calcularTotales.mockReturnValue({});

      listar(
        crearPeticion({
          consulta: {
            fecha: '2026-08-03',
            colaboradorId: 1,
            servicioId: 2,
            medioPago: 'nequi',
            jornadaId: 3,
          },
        }),
        crearRespuesta(),
        jest.fn(),
      );

      expect(ordenesLavadoService.listarOrdenes).toHaveBeenCalledWith({
        fecha: '2026-08-03',
        colaboradorId: 1,
        servicioId: 2,
        medioPago: 'nequi',
        jornadaId: 3,
      });
    });

    it('pasa el error al siguiente manejador si el service lanza', () => {
      const error = new Error('fallo inesperado');
      ordenesLavadoService.listarOrdenes.mockImplementation(() => {
        throw error;
      });

      const next = jest.fn();
      listar(crearPeticion(), crearRespuesta(), next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('obtenerPorId', () => {
    it('responde 200 con la orden encontrada', () => {
      ordenesLavadoService.obtenerOrdenOFallar.mockReturnValue({ id: 1, estado: 'registrada' });

      const res = crearRespuesta();
      obtenerPorId(crearPeticion({ parametros: { id: 1 } }), res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ orden: { id: 1, estado: 'registrada' } });
    });

    it('pasa el error al siguiente manejador si el id no existe (404)', () => {
      const error = new Error('no encontrada');
      ordenesLavadoService.obtenerOrdenOFallar.mockImplementation(() => {
        throw error;
      });

      const next = jest.fn();
      obtenerPorId(crearPeticion({ parametros: { id: 999 } }), crearRespuesta(), next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('crear', () => {
    it('responde 201 con la orden creada', async () => {
      const datosOrden = {
        turno: 1,
        vehiculoId: 1,
        servicioId: 1,
        colaboradorId: 1,
        medioPago: 'efectivo',
      };
      ordenesLavadoService.crearOrden.mockResolvedValue({
        id: 1,
        ...datosOrden,
        estado: 'registrada',
      });

      const res = crearRespuesta();
      await crear(crearPeticion({ cuerpo: datosOrden }), res, jest.fn());

      expect(ordenesLavadoService.crearOrden).toHaveBeenCalledWith(datosOrden);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ mensaje: 'Orden de lavado registrada correctamente' }),
      );
    });

    it('pasa el error al siguiente manejador si el service lanza (404/409)', async () => {
      const error = new Error('conflicto de negocio');
      ordenesLavadoService.crearOrden.mockRejectedValue(error);

      const next = jest.fn();
      await crear(crearPeticion({ cuerpo: {} }), crearRespuesta(), next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('editar', () => {
    it('responde 200 con la orden editada', async () => {
      ordenesLavadoService.editarOrden.mockResolvedValue({ id: 1, vehiculoId: 2 });

      const res = crearRespuesta();
      await editar(
        crearPeticion({ parametros: { id: 1 }, cuerpo: { vehiculoId: 2 } }),
        res,
        jest.fn(),
      );

      expect(ordenesLavadoService.editarOrden).toHaveBeenCalledWith(1, { vehiculoId: 2 });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ mensaje: 'Orden de lavado actualizada correctamente' }),
      );
    });

    it('pasa el error al siguiente manejador si el service lanza (404/409)', async () => {
      const error = new Error('conflicto de negocio');
      ordenesLavadoService.editarOrden.mockRejectedValue(error);

      const next = jest.fn();
      await editar(crearPeticion({ parametros: { id: 1 }, cuerpo: {} }), crearRespuesta(), next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('cambiarEstado', () => {
    it('responde 200 con la orden con el estado actualizado', () => {
      ordenesLavadoService.cambiarEstadoOrden.mockReturnValue({ id: 1, estado: 'en_proceso' });

      const res = crearRespuesta();
      cambiarEstado(
        crearPeticion({ parametros: { id: 1 }, cuerpo: { estado: 'en_proceso' } }),
        res,
        jest.fn(),
      );

      expect(ordenesLavadoService.cambiarEstadoOrden).toHaveBeenCalledWith(
        1,
        'en_proceso',
        undefined,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ mensaje: 'Estado de la orden actualizado correctamente' }),
      );
    });

    it('pasa el motivo al service cuando viene en el body', () => {
      ordenesLavadoService.cambiarEstadoOrden.mockReturnValue({ id: 1, estado: 'cancelada' });

      cambiarEstado(
        crearPeticion({
          parametros: { id: 1 },
          cuerpo: { estado: 'cancelada', motivo: 'El cliente no llegó' },
        }),
        crearRespuesta(),
        jest.fn(),
      );

      expect(ordenesLavadoService.cambiarEstadoOrden).toHaveBeenCalledWith(
        1,
        'cancelada',
        'El cliente no llegó',
      );
    });

    it('pasa el error al siguiente manejador si la transición no es válida (409)', () => {
      const error = new Error('transición inválida');
      ordenesLavadoService.cambiarEstadoOrden.mockImplementation(() => {
        throw error;
      });

      const next = jest.fn();
      cambiarEstado(
        crearPeticion({ parametros: { id: 1 }, cuerpo: { estado: 'entregada' } }),
        crearRespuesta(),
        next,
      );

      expect(next).toHaveBeenCalledWith(error);
    });

    it('pasa el error al siguiente manejador si falta el motivo al cancelar (400)', () => {
      const error = new Error('motivo obligatorio');
      ordenesLavadoService.cambiarEstadoOrden.mockImplementation(() => {
        throw error;
      });

      const next = jest.fn();
      cambiarEstado(
        crearPeticion({ parametros: { id: 1 }, cuerpo: { estado: 'cancelada' } }),
        crearRespuesta(),
        next,
      );

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
