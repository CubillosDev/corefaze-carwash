const vehiculosService = require('../../../src/services/vehiculos.service');
const ordenesLavadoService = require('../../../src/services/ordenesLavado.service');
const {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
} = require('../../../src/controllers/vehiculos.controller');

jest.mock('../../../src/services/vehiculos.service');
jest.mock('../../../src/services/ordenesLavado.service');

const crearRespuesta = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// usuario: req.usuario ya existe siempre aquí (autenticarJWT corre antes
// en la ruta real); vehiculos.controller.js lo usa para la auditoría.
const crearPeticion = ({ cuerpo = {}, parametros = {}, usuario = { id: 1 } } = {}) => ({
  datos: { cuerpo, parametros },
  usuario,
});

describe('vehiculos.controller', () => {
  describe('listar', () => {
    it('responde 200 con la lista de vehículos', async () => {
      vehiculosService.listarVehiculos.mockResolvedValue([{ id: 1 }, { id: 2 }]);

      const res = crearRespuesta();
      await listar(crearPeticion(), res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ vehiculos: [{ id: 1 }, { id: 2 }] });
    });
  });

  describe('obtenerPorId', () => {
    it('responde 200 con el vehículo encontrado', async () => {
      vehiculosService.obtenerVehiculoOFallar.mockResolvedValue({ id: 1, placa: 'ABC123' });

      const res = crearRespuesta();
      await obtenerPorId(crearPeticion({ parametros: { id: 1 } }), res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ vehiculo: { id: 1, placa: 'ABC123' } });
    });

    it('propaga el error si el service lanza (404) — sin try/catch, Express 5 lo atrapa solo', async () => {
      const error = new Error('no encontrado');
      vehiculosService.obtenerVehiculoOFallar.mockRejectedValue(error);

      await expect(
        obtenerPorId(crearPeticion({ parametros: { id: 999 } }), crearRespuesta(), jest.fn()),
      ).rejects.toThrow(error);
    });
  });

  describe('crear', () => {
    it('responde 201 con el vehículo creado, pasando el usuario autenticado para la auditoría', async () => {
      const datosVehiculo = { placa: 'ABC123', tipoVehiculo: 'automovil', clienteId: 1 };
      vehiculosService.crearVehiculo.mockResolvedValue({ id: 1, ...datosVehiculo });

      const res = crearRespuesta();
      await crear(crearPeticion({ cuerpo: datosVehiculo, usuario: { id: 7 } }), res, jest.fn());

      expect(vehiculosService.crearVehiculo).toHaveBeenCalledWith(datosVehiculo, 7);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ mensaje: 'Vehículo registrado correctamente' }),
      );
    });

    it('propaga el error si la placa ya existe (409)', async () => {
      const error = new Error('placa duplicada');
      vehiculosService.crearVehiculo.mockRejectedValue(error);

      await expect(
        crear(crearPeticion({ cuerpo: {} }), crearRespuesta(), jest.fn()),
      ).rejects.toThrow(error);
    });
  });

  describe('actualizar', () => {
    it('responde 200 con el vehículo actualizado', async () => {
      vehiculosService.actualizarVehiculo.mockResolvedValue({ id: 1, color: 'rojo' });

      const res = crearRespuesta();
      await actualizar(
        crearPeticion({
          parametros: { id: 1 },
          cuerpo: { color: 'rojo' },
          usuario: { id: 7 },
        }),
        res,
        jest.fn(),
      );

      expect(vehiculosService.actualizarVehiculo).toHaveBeenCalledWith(1, { color: 'rojo' }, 7);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('eliminar', () => {
    it('responde 200 al eliminar correctamente', async () => {
      ordenesLavadoService.vehiculoTieneOrdenes.mockReturnValue(false);
      vehiculosService.eliminarVehiculo.mockResolvedValue(undefined);

      const res = crearRespuesta();
      await eliminar(crearPeticion({ parametros: { id: 1 }, usuario: { id: 7 } }), res, jest.fn());

      expect(vehiculosService.eliminarVehiculo).toHaveBeenCalledWith(1, 7);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'Vehículo eliminado correctamente' });
    });

    it('propaga el error si el id no existe (404)', async () => {
      ordenesLavadoService.vehiculoTieneOrdenes.mockReturnValue(false);
      const error = new Error('no encontrado');
      vehiculosService.eliminarVehiculo.mockRejectedValue(error);

      await expect(
        eliminar(crearPeticion({ parametros: { id: 999 } }), crearRespuesta(), jest.fn()),
      ).rejects.toThrow(error);
    });

    it('responde 409 si el vehículo tiene órdenes de lavado asociadas, sin llamar a eliminarVehiculo', async () => {
      ordenesLavadoService.vehiculoTieneOrdenes.mockReturnValue(true);

      await expect(
        eliminar(crearPeticion({ parametros: { id: 1 } }), crearRespuesta(), jest.fn()),
      ).rejects.toMatchObject({ estado: 409 });
      expect(vehiculosService.eliminarVehiculo).not.toHaveBeenCalled();
    });
  });
});
