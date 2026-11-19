const parametrosService = require('../../../src/services/parametros.service');
const { obtener, actualizar } = require('../../../src/controllers/parametros.controller');

jest.mock('../../../src/services/parametros.service');

const crearRespuesta = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const crearPeticion = ({
  cuerpo = {},
  usuario = { id: 1, email: 'dueno@carwash.test', rol: 'superadmin' },
} = {}) => ({ datos: { cuerpo }, usuario });

describe('parametros.controller', () => {
  describe('obtener', () => {
    it('responde 200 con los parámetros de negocio', async () => {
      const parametros = { id: 1, nombreNegocio: 'Car Wash', porcentajeComision: 0.37 };
      parametrosService.obtenerParametros.mockResolvedValue(parametros);

      const res = crearRespuesta();
      await obtener(crearPeticion(), res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ parametros });
    });

    it('propaga el error si el service falla inesperadamente', async () => {
      const error = new Error('fallo inesperado');
      parametrosService.obtenerParametros.mockRejectedValue(error);

      await expect(obtener(crearPeticion(), crearRespuesta(), jest.fn())).rejects.toThrow(error);
    });
  });

  describe('actualizar', () => {
    it('responde 200 con los parámetros actualizados, usando el id del usuario autenticado', async () => {
      const parametros = { id: 1, nombreNegocio: 'Nuevo nombre' };
      parametrosService.actualizarParametros.mockResolvedValue(parametros);

      const res = crearRespuesta();
      await actualizar(
        crearPeticion({
          cuerpo: { nombreNegocio: 'Nuevo nombre' },
          usuario: { id: 1, email: 'dueno@carwash.test', rol: 'superadmin' },
        }),
        res,
        jest.fn(),
      );

      expect(parametrosService.actualizarParametros).toHaveBeenCalledWith(
        { nombreNegocio: 'Nuevo nombre' },
        1,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          mensaje: 'Parámetros de negocio actualizados correctamente',
          parametros,
        }),
      );
    });

    it('propaga el error si el service falla (p. ej. formato inválido)', async () => {
      const error = new Error('conflicto de negocio');
      parametrosService.actualizarParametros.mockRejectedValue(error);

      await expect(
        actualizar(crearPeticion({ cuerpo: {} }), crearRespuesta(), jest.fn()),
      ).rejects.toThrow(error);
    });
  });
});
