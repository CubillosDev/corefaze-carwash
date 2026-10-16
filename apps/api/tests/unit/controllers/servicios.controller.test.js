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

const crearPeticion = ({ cuerpo = {}, parametros = {} } = {}) => ({
  datos: { cuerpo, parametros },
});

describe('servicios.controller', () => {
  describe('listar', () => {
    it('responde 200 con la lista de servicios', () => {
      serviciosService.listarServicios.mockReturnValue([{ id: 1 }, { id: 2 }]);

      const res = crearRespuesta();
      listar(crearPeticion(), res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ servicios: [{ id: 1 }, { id: 2 }] });
    });

    it('pasa el error al siguiente manejador si el service lanza', () => {
      const error = new Error('fallo inesperado');
      serviciosService.listarServicios.mockImplementation(() => {
        throw error;
      });

      const next = jest.fn();
      listar(crearPeticion(), crearRespuesta(), next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('obtenerPorId', () => {
    it('responde 200 con el servicio encontrado', () => {
      serviciosService.obtenerServicioOFallar.mockReturnValue({ id: 1, nombre: 'Lavado básico' });

      const res = crearRespuesta();
      obtenerPorId(crearPeticion({ parametros: { id: 1 } }), res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ servicio: { id: 1, nombre: 'Lavado básico' } });
    });

    it('pasa el error al siguiente manejador si el id no existe (404)', () => {
      const error = new Error('no encontrado');
      serviciosService.obtenerServicioOFallar.mockImplementation(() => {
        throw error;
      });

      const next = jest.fn();
      obtenerPorId(crearPeticion({ parametros: { id: 999 } }), crearRespuesta(), next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('crear', () => {
    it('responde 201 con el servicio creado', () => {
      const datosServicio = {
        numero: 1,
        nombre: 'Lavado básico',
        descripcion: 'Lavado exterior con shampoo',
        categoria: 'basico',
        tarifas: [{ tipoVehiculo: 'automovil', valor: 15000 }],
      };
      serviciosService.crearServicio.mockReturnValue({ id: 1, ...datosServicio });

      const res = crearRespuesta();
      crear(crearPeticion({ cuerpo: datosServicio }), res, jest.fn());

      expect(serviciosService.crearServicio).toHaveBeenCalledWith(datosServicio);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ mensaje: 'Servicio registrado correctamente' }),
      );
    });

    it('pasa el error al siguiente manejador si el número ya existe (409)', () => {
      const error = new Error('número ocupado');
      serviciosService.crearServicio.mockImplementation(() => {
        throw error;
      });

      const next = jest.fn();
      crear(crearPeticion({ cuerpo: {} }), crearRespuesta(), next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('actualizar', () => {
    it('responde 200 con el servicio actualizado', () => {
      serviciosService.actualizarServicio.mockReturnValue({ id: 1, nombre: 'Lavado premium' });

      const res = crearRespuesta();
      actualizar(
        crearPeticion({ parametros: { id: 1 }, cuerpo: { nombre: 'Lavado premium' } }),
        res,
        jest.fn(),
      );

      expect(serviciosService.actualizarServicio).toHaveBeenCalledWith(1, {
        nombre: 'Lavado premium',
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ mensaje: 'Servicio actualizado correctamente' }),
      );
    });

    it('pasa el error al siguiente manejador si el id no existe (404)', () => {
      const error = new Error('no encontrado');
      serviciosService.actualizarServicio.mockImplementation(() => {
        throw error;
      });

      const next = jest.fn();
      actualizar(crearPeticion({ parametros: { id: 999 } }), crearRespuesta(), next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('eliminar', () => {
    it('responde 200 al eliminar correctamente', () => {
      ordenesLavadoService.servicioTieneOrdenes.mockReturnValue(false);

      const res = crearRespuesta();
      eliminar(crearPeticion({ parametros: { id: 1 } }), res, jest.fn());

      expect(serviciosService.eliminarServicio).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'Servicio eliminado correctamente' });
    });

    it('pasa el error al siguiente manejador si el id no existe (404)', () => {
      ordenesLavadoService.servicioTieneOrdenes.mockReturnValue(false);
      const error = new Error('no encontrado');
      serviciosService.eliminarServicio.mockImplementation(() => {
        throw error;
      });

      const next = jest.fn();
      eliminar(crearPeticion({ parametros: { id: 999 } }), crearRespuesta(), next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('responde 409 si el servicio tiene órdenes de lavado asociadas y no elimina', () => {
      ordenesLavadoService.servicioTieneOrdenes.mockReturnValue(true);

      const next = jest.fn();
      eliminar(crearPeticion({ parametros: { id: 1 } }), crearRespuesta(), next);

      const [error] = next.mock.calls[0];
      expect(error.estado).toBe(409);
      expect(serviciosService.eliminarServicio).not.toHaveBeenCalled();
    });
  });
});
