const creditoService = require('../../../src/services/credito.service');
const {
  listarClientes,
  listarOrdenesPendientes,
  listarPagos,
  obtenerPagoPorId,
  registrarPago,
} = require('../../../src/controllers/credito.controller');

jest.mock('../../../src/services/credito.service');

const crearRespuesta = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// usuario: req.usuario ya existe siempre aquí (autenticarJWT corre antes
// en la ruta real); registrarPago lo usa para la auditoría.
const crearPeticion = ({
  cuerpo = {},
  parametros = {},
  consulta = {},
  usuario = { id: 1 },
} = {}) => ({
  datos: { cuerpo, parametros, consulta },
  usuario,
});

describe('credito.controller', () => {
  describe('listarClientes', () => {
    it('responde 200 con la lista de clientes con crédito', async () => {
      creditoService.listarClientesConCredito.mockResolvedValue([{ id: 1, saldoPendiente: 50000 }]);

      const res = crearRespuesta();
      await listarClientes(crearPeticion(), res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ clientes: [{ id: 1, saldoPendiente: 50000 }] });
    });
  });

  describe('listarOrdenesPendientes', () => {
    it('responde 200 con las órdenes pendientes del cliente', async () => {
      creditoService.listarOrdenesPendientesDeCliente.mockResolvedValue([{ id: 10 }]);

      const res = crearRespuesta();
      await listarOrdenesPendientes(crearPeticion({ parametros: { id: 1 } }), res, jest.fn());

      expect(creditoService.listarOrdenesPendientesDeCliente).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ ordenes: [{ id: 10 }] });
    });

    it('propaga el error si el cliente no existe (404)', async () => {
      const error = new Error('no encontrado');
      creditoService.listarOrdenesPendientesDeCliente.mockRejectedValue(error);

      await expect(
        listarOrdenesPendientes(
          crearPeticion({ parametros: { id: 999 } }),
          crearRespuesta(),
          jest.fn(),
        ),
      ).rejects.toThrow(error);
    });
  });

  describe('listarPagos', () => {
    it('responde 200 con la página de pagos, pasando la consulta completa (incluye paginación)', async () => {
      const resultado = { pagos: [{ id: 1 }], total: 1, pagina: 1, porPagina: 20, totalPaginas: 1 };
      creditoService.listarPagos.mockResolvedValue(resultado);

      const res = crearRespuesta();
      await listarPagos(crearPeticion({ consulta: { clienteId: 1, pagina: 1 } }), res, jest.fn());

      expect(creditoService.listarPagos).toHaveBeenCalledWith({ clienteId: 1, pagina: 1 });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(resultado);
    });
  });

  describe('obtenerPagoPorId', () => {
    it('responde 200 con el pago encontrado', async () => {
      creditoService.obtenerPagoOFallar.mockResolvedValue({ id: 1, valorTotal: 30000 });

      const res = crearRespuesta();
      await obtenerPagoPorId(crearPeticion({ parametros: { id: 1 } }), res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ pago: { id: 1, valorTotal: 30000 } });
    });

    it('propaga el error si el pago no existe (404)', async () => {
      const error = new Error('no encontrado');
      creditoService.obtenerPagoOFallar.mockRejectedValue(error);

      await expect(
        obtenerPagoPorId(crearPeticion({ parametros: { id: 999 } }), crearRespuesta(), jest.fn()),
      ).rejects.toThrow(error);
    });
  });

  describe('registrarPago', () => {
    it('responde 201 con el pago creado, pasando el usuario autenticado para la auditoría', async () => {
      const datosPago = { clienteId: 1, ordenIds: [10, 11] };
      creditoService.registrarPagoCredito.mockResolvedValue({ id: 5, ...datosPago });

      const res = crearRespuesta();
      await registrarPago(crearPeticion({ cuerpo: datosPago, usuario: { id: 7 } }), res, jest.fn());

      expect(creditoService.registrarPagoCredito).toHaveBeenCalledWith(datosPago, 7);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ mensaje: 'Pago de crédito registrado correctamente' }),
      );
    });

    it('propaga el error si alguna orden no es pagable (409)', async () => {
      const error = new Error('conflicto');
      creditoService.registrarPagoCredito.mockRejectedValue(error);

      await expect(
        registrarPago(
          crearPeticion({ cuerpo: { clienteId: 1, ordenIds: [10] } }),
          crearRespuesta(),
          jest.fn(),
        ),
      ).rejects.toThrow(error);
    });
  });
});
