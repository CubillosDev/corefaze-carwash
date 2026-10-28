const serviciosService = require('../../../src/services/servicios.service');
const ordenesLavadoService = require('../../../src/services/ordenesLavado.service');
const {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
} = require('../../../src/controllers/servicios.controller');

jest.mock('../../../src/services/servicios.service');
jest.mock('../../../src/services/ordenesLavado.service');

const crearRespuesta = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// usuario: req.usuario ya existe siempre aquí (autenticarJWT corre antes
// en la ruta real); servicios.controller.js lo usa para la auditoría.
const crearPeticion = ({ cuerpo = {}, parametros = {}, usuario = { id: 1 } } = {}) => ({
  datos: { cuerpo, parametros },
  usuario,
});

describe('servicios.controller', () => {
  describe('listar', () => {
    it('responde 200 con la lista de servicios', async () => {
      serviciosService.listarServicios.mockResolvedValue([{ id: 1 }, { id: 2 }]);

      const res = crearRespuesta();
      await listar(crearPeticion(), res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ servicios: [{ id: 1 }, { id: 2 }] });
    });
  });

  describe('obtenerPorId', () => {
    it('responde 200 con el servicio encontrado', async () => {
      serviciosService.obtenerServicioOFallar.mockResolvedValue({ id: 1, nombre: 'Lavado básico' });

      const res = crearRespuesta();
      await obtenerPorId(crearPeticion({ parametros: { id: 1 } }), res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ servicio: { id: 1, nombre: 'Lavado básico' } });
    });

    it('propaga el error si el id no existe (404) — sin try/catch, Express 5 lo atrapa solo', async () => {
      const error = new Error('no encontrado');
      serviciosService.obtenerServicioOFallar.mockRejectedValue(error);

      await expect(
        obtenerPorId(crearPeticion({ parametros: { id: 999 } }), crearRespuesta(), jest.fn()),
      ).rejects.toThrow(error);
    });
  });

  describe('crear', () => {
    it('responde 201 con el servicio creado, pasando el usuario autenticado para la auditoría', async () => {
      const datosServicio = {
        numero: 1,
        nombre: 'Lavado básico',
        descripcion: 'Lavado exterior con shampoo',
        categoria: 'basico',
        tarifas: [{ tipoVehiculo: 'automovil', valor: 15000 }],
      };
      serviciosService.crearServicio.mockResolvedValue({ id: 1, ...datosServicio });

      const res = crearRespuesta();
      await crear(crearPeticion({ cuerpo: datosServicio, usuario: { id: 7 } }), res, jest.fn());

      expect(serviciosService.crearServicio).toHaveBeenCalledWith(datosServicio, 7);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ mensaje: 'Servicio registrado correctamente' }),
      );
    });

    it('propaga el error si el número ya existe (409)', async () => {
      const error = new Error('número ocupado');
      serviciosService.crearServicio.mockRejectedValue(error);

      await expect(
        crear(crearPeticion({ cuerpo: {} }), crearRespuesta(), jest.fn()),
      ).rejects.toThrow(error);
    });
  });

  describe('actualizar', () => {
    it('responde 200 con el servicio actualizado', async () => {
      serviciosService.actualizarServicio.mockResolvedValue({ id: 1, nombre: 'Lavado premium' });

      const res = crearRespuesta();
      await actualizar(
        crearPeticion({
          parametros: { id: 1 },
          cuerpo: { nombre: 'Lavado premium' },
          usuario: { id: 7 },
        }),
        res,
        jest.fn(),
      );

      expect(serviciosService.actualizarServicio).toHaveBeenCalledWith(
        1,
        { nombre: 'Lavado premium' },
        7,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ mensaje: 'Servicio actualizado correctamente' }),
      );
    });

    it('propaga el error si el id no existe (404)', async () => {
      const error = new Error('no encontrado');
      serviciosService.actualizarServicio.mockRejectedValue(error);

      await expect(
        actualizar(crearPeticion({ parametros: { id: 999 } }), crearRespuesta(), jest.fn()),
      ).rejects.toThrow(error);
    });
  });

  describe('eliminar', () => {
    it('responde 200 al eliminar correctamente', async () => {
      ordenesLavadoService.servicioTieneOrdenes.mockReturnValue(false);
      serviciosService.eliminarServicio.mockResolvedValue(undefined);

      const res = crearRespuesta();
      await eliminar(crearPeticion({ parametros: { id: 1 }, usuario: { id: 7 } }), res, jest.fn());

      expect(serviciosService.eliminarServicio).toHaveBeenCalledWith(1, 7);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'Servicio eliminado correctamente' });
    });

    it('propaga el error si el id no existe (404)', async () => {
      ordenesLavadoService.servicioTieneOrdenes.mockReturnValue(false);
      const error = new Error('no encontrado');
      serviciosService.eliminarServicio.mockRejectedValue(error);

      await expect(
        eliminar(crearPeticion({ parametros: { id: 999 } }), crearRespuesta(), jest.fn()),
      ).rejects.toThrow(error);
    });

    it('responde 409 si el servicio tiene órdenes de lavado asociadas, sin llamar a eliminarServicio', async () => {
      ordenesLavadoService.servicioTieneOrdenes.mockReturnValue(true);

      await expect(
        eliminar(crearPeticion({ parametros: { id: 1 } }), crearRespuesta(), jest.fn()),
      ).rejects.toMatchObject({ estado: 409 });
      expect(serviciosService.eliminarServicio).not.toHaveBeenCalled();
    });
  });
});
