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

const crearPeticion = ({
  cuerpo = {},
  parametros = {},
  consulta = {},
  usuario = { id: 1, email: 'administrador@lavadero.com', rol: 'administrador' },
} = {}) => ({
  datos: { cuerpo, parametros, consulta },
  usuario,
});

describe('ordenesLavado.controller', () => {
  describe('listar', () => {
    it('responde 200 con la lista de órdenes y sus totales', async () => {
      const ordenes = [{ id: 1 }, { id: 2 }];
      const totales = { cantidadServicios: 2, totalGeneral: 30000, totalesPorMedioPago: {} };
      ordenesLavadoService.listarOrdenes.mockResolvedValue(ordenes);
      ordenesLavadoService.calcularTotales.mockReturnValue(totales);

      const res = crearRespuesta();
      await listar(crearPeticion(), res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ ordenes, totales });
    });

    it('calcula los totales sobre exactamente el mismo arreglo que devuelve en "ordenes"', async () => {
      const ordenes = [{ id: 1 }, { id: 2 }, { id: 3 }];
      ordenesLavadoService.listarOrdenes.mockResolvedValue(ordenes);
      ordenesLavadoService.calcularTotales.mockReturnValue({});

      await listar(crearPeticion(), crearRespuesta(), jest.fn());

      expect(ordenesLavadoService.calcularTotales).toHaveBeenCalledWith(ordenes);
    });

    it('llama a listarOrdenes con todos los filtros en undefined cuando no hay query', async () => {
      ordenesLavadoService.listarOrdenes.mockResolvedValue([]);
      ordenesLavadoService.calcularTotales.mockReturnValue({});

      await listar(crearPeticion(), crearRespuesta(), jest.fn());

      expect(ordenesLavadoService.listarOrdenes).toHaveBeenCalledWith({
        fecha: undefined,
        colaboradorId: undefined,
        servicioId: undefined,
        medioPago: undefined,
        jornadaId: undefined,
      });
    });

    it('llama a listarOrdenes con los filtros que sí vienen en la query', async () => {
      ordenesLavadoService.listarOrdenes.mockResolvedValue([]);
      ordenesLavadoService.calcularTotales.mockReturnValue({});

      await listar(
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

    it('propaga el error si el service lanza — sin try/catch, Express 5 lo atrapa solo', async () => {
      const error = new Error('fallo inesperado');
      ordenesLavadoService.listarOrdenes.mockRejectedValue(error);

      await expect(listar(crearPeticion(), crearRespuesta(), jest.fn())).rejects.toThrow(error);
    });
  });

  describe('obtenerPorId', () => {
    it('responde 200 con la orden encontrada', async () => {
      ordenesLavadoService.obtenerOrdenOFallar.mockResolvedValue({ id: 1, estado: 'registrada' });

      const res = crearRespuesta();
      await obtenerPorId(crearPeticion({ parametros: { id: 1 } }), res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ orden: { id: 1, estado: 'registrada' } });
    });

    it('propaga el error si el id no existe (404)', async () => {
      const error = new Error('no encontrada');
      ordenesLavadoService.obtenerOrdenOFallar.mockRejectedValue(error);

      await expect(
        obtenerPorId(crearPeticion({ parametros: { id: 999 } }), crearRespuesta(), jest.fn()),
      ).rejects.toThrow(error);
    });
  });

  describe('crear', () => {
    it('responde 201 con la orden creada, usando el id del usuario autenticado', async () => {
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
      await crear(
        crearPeticion({
          cuerpo: datosOrden,
          usuario: { id: 7, email: 'soporte@lavadero.com', rol: 'soporte' },
        }),
        res,
        jest.fn(),
      );

      expect(ordenesLavadoService.crearOrden).toHaveBeenCalledWith(datosOrden, 7);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ mensaje: 'Orden de lavado registrada correctamente' }),
      );
    });

    it('propaga el error si el service lanza (404/409)', async () => {
      const error = new Error('conflicto de negocio');
      ordenesLavadoService.crearOrden.mockRejectedValue(error);

      await expect(
        crear(crearPeticion({ cuerpo: {} }), crearRespuesta(), jest.fn()),
      ).rejects.toThrow(error);
    });
  });

  describe('editar', () => {
    it('responde 200 con la orden editada, usando el id del usuario autenticado', async () => {
      ordenesLavadoService.editarOrden.mockResolvedValue({ id: 1, vehiculoId: 2 });

      const res = crearRespuesta();
      await editar(
        crearPeticion({
          parametros: { id: 1 },
          cuerpo: { vehiculoId: 2 },
          usuario: { id: 7, email: 'soporte@lavadero.com', rol: 'soporte' },
        }),
        res,
        jest.fn(),
      );

      expect(ordenesLavadoService.editarOrden).toHaveBeenCalledWith(1, { vehiculoId: 2 }, 7);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ mensaje: 'Orden de lavado actualizada correctamente' }),
      );
    });

    it('propaga el error si el service lanza (404/409)', async () => {
      const error = new Error('conflicto de negocio');
      ordenesLavadoService.editarOrden.mockRejectedValue(error);

      await expect(
        editar(crearPeticion({ parametros: { id: 1 }, cuerpo: {} }), crearRespuesta(), jest.fn()),
      ).rejects.toThrow(error);
    });
  });

  describe('cambiarEstado', () => {
    it('responde 200 con la orden con el estado actualizado, usando el id del usuario autenticado', async () => {
      ordenesLavadoService.cambiarEstadoOrden.mockResolvedValue({ id: 1, estado: 'en_proceso' });

      const res = crearRespuesta();
      await cambiarEstado(
        crearPeticion({
          parametros: { id: 1 },
          cuerpo: { estado: 'en_proceso' },
          usuario: { id: 7, email: 'soporte@lavadero.com', rol: 'soporte' },
        }),
        res,
        jest.fn(),
      );

      expect(ordenesLavadoService.cambiarEstadoOrden).toHaveBeenCalledWith(
        1,
        'en_proceso',
        undefined,
        7,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ mensaje: 'Estado de la orden actualizado correctamente' }),
      );
    });

    it('pasa el motivo al service cuando viene en el body', async () => {
      ordenesLavadoService.cambiarEstadoOrden.mockResolvedValue({ id: 1, estado: 'cancelada' });

      await cambiarEstado(
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
        1,
      );
    });

    it('propaga el error si la transición no es válida (409)', async () => {
      const error = new Error('transición inválida');
      ordenesLavadoService.cambiarEstadoOrden.mockRejectedValue(error);

      await expect(
        cambiarEstado(
          crearPeticion({ parametros: { id: 1 }, cuerpo: { estado: 'entregada' } }),
          crearRespuesta(),
          jest.fn(),
        ),
      ).rejects.toThrow(error);
    });

    it('propaga el error si falta el motivo al cancelar (400)', async () => {
      const error = new Error('motivo obligatorio');
      ordenesLavadoService.cambiarEstadoOrden.mockRejectedValue(error);

      await expect(
        cambiarEstado(
          crearPeticion({ parametros: { id: 1 }, cuerpo: { estado: 'cancelada' } }),
          crearRespuesta(),
          jest.fn(),
        ),
      ).rejects.toThrow(error);
    });
  });
});
