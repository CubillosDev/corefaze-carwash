const clientesService = require('../../../src/services/clientes.service');
const vehiculosService = require('../../../src/services/vehiculos.service');
const {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
} = require('../../../src/controllers/clientes.controller');

jest.mock('../../../src/services/clientes.service');
jest.mock('../../../src/services/vehiculos.service');

const crearRespuesta = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// usuario: req.usuario ya existe siempre aquí (autenticarJWT corre antes
// en la ruta real); clientes.controller.js lo usa para la auditoría.
const crearPeticion = ({ cuerpo = {}, parametros = {}, usuario = { id: 1 } } = {}) => ({
  datos: { cuerpo, parametros },
  usuario,
});

describe('clientes.controller', () => {
  describe('listar', () => {
    it('responde 200 con la lista de clientes', async () => {
      clientesService.listarClientes.mockResolvedValue([{ id: 1 }, { id: 2 }]);

      const res = crearRespuesta();
      await listar(crearPeticion(), res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ clientes: [{ id: 1 }, { id: 2 }] });
    });
  });

  describe('obtenerPorId', () => {
    it('responde 200 con el cliente encontrado', async () => {
      clientesService.obtenerClienteOFallar.mockResolvedValue({ id: 1, nombre: 'Ana' });

      const res = crearRespuesta();
      await obtenerPorId(crearPeticion({ parametros: { id: 1 } }), res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ cliente: { id: 1, nombre: 'Ana' } });
    });

    it('propaga el error si el service lanza (404) — sin try/catch, Express 5 lo atrapa solo', async () => {
      const error = new Error('no encontrado');
      clientesService.obtenerClienteOFallar.mockRejectedValue(error);

      await expect(
        obtenerPorId(crearPeticion({ parametros: { id: 999 } }), crearRespuesta(), jest.fn()),
      ).rejects.toThrow(error);
    });
  });

  describe('crear', () => {
    it('responde 201 con el cliente creado, pasando el usuario autenticado para la auditoría', async () => {
      const datosCliente = {
        nombre: 'Ana',
        documento: '123',
        tipo: 'particular',
        telefono: '3001234567',
      };
      clientesService.crearCliente.mockResolvedValue({ id: 1, ...datosCliente });

      const res = crearRespuesta();
      await crear(crearPeticion({ cuerpo: datosCliente, usuario: { id: 7 } }), res, jest.fn());

      expect(clientesService.crearCliente).toHaveBeenCalledWith(datosCliente, 7);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ mensaje: 'Cliente registrado correctamente' }),
      );
    });

    it('propaga el error si el documento ya existe (409)', async () => {
      const error = new Error('documento duplicado');
      clientesService.crearCliente.mockRejectedValue(error);

      await expect(
        crear(crearPeticion({ cuerpo: {} }), crearRespuesta(), jest.fn()),
      ).rejects.toThrow(error);
    });
  });

  describe('actualizar', () => {
    it('responde 200 con el cliente actualizado', async () => {
      clientesService.actualizarCliente.mockResolvedValue({ id: 1, telefono: '3009999999' });

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

      expect(clientesService.actualizarCliente).toHaveBeenCalledWith(
        1,
        { telefono: '3009999999' },
        7,
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('eliminar', () => {
    it('responde 200 al eliminar correctamente', async () => {
      vehiculosService.clienteTieneVehiculos.mockReturnValue(false);
      clientesService.eliminarCliente.mockResolvedValue(undefined);

      const res = crearRespuesta();
      await eliminar(crearPeticion({ parametros: { id: 1 }, usuario: { id: 7 } }), res, jest.fn());

      expect(clientesService.eliminarCliente).toHaveBeenCalledWith(1, 7);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'Cliente eliminado correctamente' });
    });

    it('propaga el error si el id no existe (404)', async () => {
      vehiculosService.clienteTieneVehiculos.mockReturnValue(false);
      const error = new Error('no encontrado');
      clientesService.eliminarCliente.mockRejectedValue(error);

      await expect(
        eliminar(crearPeticion({ parametros: { id: 999 } }), crearRespuesta(), jest.fn()),
      ).rejects.toThrow(error);
    });

    it('responde 409 si el cliente tiene vehículos asociados, sin llamar a eliminarCliente', async () => {
      vehiculosService.clienteTieneVehiculos.mockReturnValue(true);

      await expect(
        eliminar(crearPeticion({ parametros: { id: 1 } }), crearRespuesta(), jest.fn()),
      ).rejects.toMatchObject({ estado: 409 });
      expect(clientesService.eliminarCliente).not.toHaveBeenCalled();
    });
  });
});
