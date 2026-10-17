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

const crearPeticion = ({ cuerpo = {}, parametros = {} } = {}) => ({
  datos: { cuerpo, parametros },
});

describe('clientes.controller', () => {
  describe('listar', () => {
    it('responde 200 con la lista de clientes', () => {
      clientesService.listarClientes.mockReturnValue([{ id: 1 }, { id: 2 }]);

      const res = crearRespuesta();
      listar(crearPeticion(), res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ clientes: [{ id: 1 }, { id: 2 }] });
    });
  });

  describe('obtenerPorId', () => {
    it('responde 200 con el cliente encontrado', () => {
      clientesService.obtenerClienteOFallar.mockReturnValue({ id: 1, nombre: 'Ana' });

      const res = crearRespuesta();
      obtenerPorId(crearPeticion({ parametros: { id: 1 } }), res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ cliente: { id: 1, nombre: 'Ana' } });
    });

    it('pasa el error al siguiente manejador si el service lanza (404)', () => {
      const error = new Error('no encontrado');
      clientesService.obtenerClienteOFallar.mockImplementation(() => {
        throw error;
      });

      const next = jest.fn();
      obtenerPorId(crearPeticion({ parametros: { id: 999 } }), crearRespuesta(), next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('crear', () => {
    it('responde 201 con el cliente creado', () => {
      const datosCliente = {
        nombre: 'Ana',
        documento: '123',
        tipo: 'particular',
        telefono: '3001234567',
      };
      clientesService.crearCliente.mockReturnValue({ id: 1, ...datosCliente });

      const res = crearRespuesta();
      crear(crearPeticion({ cuerpo: datosCliente }), res, jest.fn());

      expect(clientesService.crearCliente).toHaveBeenCalledWith(datosCliente);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ mensaje: 'Cliente registrado correctamente' }),
      );
    });

    it('pasa el error al siguiente manejador si el documento ya existe (409)', () => {
      const error = new Error('documento duplicado');
      clientesService.crearCliente.mockImplementation(() => {
        throw error;
      });

      const next = jest.fn();
      crear(crearPeticion({ cuerpo: {} }), crearRespuesta(), next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('actualizar', () => {
    it('responde 200 con el cliente actualizado', () => {
      clientesService.actualizarCliente.mockReturnValue({ id: 1, telefono: '3009999999' });

      const res = crearRespuesta();
      actualizar(
        crearPeticion({ parametros: { id: 1 }, cuerpo: { telefono: '3009999999' } }),
        res,
        jest.fn(),
      );

      expect(clientesService.actualizarCliente).toHaveBeenCalledWith(1, { telefono: '3009999999' });
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('eliminar', () => {
    it('responde 200 al eliminar correctamente', () => {
      vehiculosService.clienteTieneVehiculos.mockReturnValue(false);

      const res = crearRespuesta();
      eliminar(crearPeticion({ parametros: { id: 1 } }), res, jest.fn());

      expect(clientesService.eliminarCliente).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'Cliente eliminado correctamente' });
    });

    it('pasa el error al siguiente manejador si el id no existe (404)', () => {
      vehiculosService.clienteTieneVehiculos.mockReturnValue(false);
      const error = new Error('no encontrado');
      clientesService.eliminarCliente.mockImplementation(() => {
        throw error;
      });

      const next = jest.fn();
      eliminar(crearPeticion({ parametros: { id: 999 } }), crearRespuesta(), next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('responde 409 si el cliente tiene vehículos asociados', () => {
      vehiculosService.clienteTieneVehiculos.mockReturnValue(true);

      const next = jest.fn();
      eliminar(crearPeticion({ parametros: { id: 1 } }), crearRespuesta(), next);

      const [error] = next.mock.calls[0];
      expect(error.estado).toBe(409);
      expect(clientesService.eliminarCliente).not.toHaveBeenCalled();
    });
  });
});
