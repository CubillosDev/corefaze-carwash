const vehiculosService = require('../../../src/services/vehiculos.service');
const {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
} = require('../../../src/controllers/vehiculos.controller');

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

describe('vehiculos.controller', () => {
  describe('listar', () => {
    it('responde 200 con la lista de vehículos', () => {
      vehiculosService.listarVehiculos.mockReturnValue([{ id: 1 }, { id: 2 }]);

      const res = crearRespuesta();
      listar(crearPeticion(), res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ vehiculos: [{ id: 1 }, { id: 2 }] });
    });
  });

  describe('obtenerPorId', () => {
    it('responde 200 con el vehículo encontrado', () => {
      vehiculosService.obtenerVehiculoOFallar.mockReturnValue({ id: 1, placa: 'ABC123' });

      const res = crearRespuesta();
      obtenerPorId(crearPeticion({ parametros: { id: 1 } }), res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ vehiculo: { id: 1, placa: 'ABC123' } });
    });

    it('pasa el error al siguiente manejador si el service lanza (404)', () => {
      const error = new Error('no encontrado');
      vehiculosService.obtenerVehiculoOFallar.mockImplementation(() => {
        throw error;
      });

      const next = jest.fn();
      obtenerPorId(crearPeticion({ parametros: { id: 999 } }), crearRespuesta(), next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('crear', () => {
    it('responde 201 con el vehículo creado', () => {
      const datosVehiculo = { placa: 'ABC123', tipo: 'automovil', clienteId: 1 };
      vehiculosService.crearVehiculo.mockReturnValue({ id: 1, ...datosVehiculo });

      const res = crearRespuesta();
      crear(crearPeticion({ cuerpo: datosVehiculo }), res, jest.fn());

      expect(vehiculosService.crearVehiculo).toHaveBeenCalledWith(datosVehiculo);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ mensaje: 'Vehículo registrado correctamente' }),
      );
    });

    it('pasa el error al siguiente manejador si la placa ya existe (409)', () => {
      const error = new Error('placa duplicada');
      vehiculosService.crearVehiculo.mockImplementation(() => {
        throw error;
      });

      const next = jest.fn();
      crear(crearPeticion({ cuerpo: {} }), crearRespuesta(), next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('actualizar', () => {
    it('responde 200 con el vehículo actualizado', () => {
      vehiculosService.actualizarVehiculo.mockReturnValue({ id: 1, color: 'rojo' });

      const res = crearRespuesta();
      actualizar(
        crearPeticion({ parametros: { id: 1 }, cuerpo: { color: 'rojo' } }),
        res,
        jest.fn(),
      );

      expect(vehiculosService.actualizarVehiculo).toHaveBeenCalledWith(1, { color: 'rojo' });
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('eliminar', () => {
    it('responde 200 al eliminar correctamente', () => {
      const res = crearRespuesta();
      eliminar(crearPeticion({ parametros: { id: 1 } }), res, jest.fn());

      expect(vehiculosService.eliminarVehiculo).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'Vehículo eliminado correctamente' });
    });

    it('pasa el error al siguiente manejador si el id no existe (404)', () => {
      const error = new Error('no encontrado');
      vehiculosService.eliminarVehiculo.mockImplementation(() => {
        throw error;
      });

      const next = jest.fn();
      eliminar(crearPeticion({ parametros: { id: 999 } }), crearRespuesta(), next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
