const usuariosService = require('../../../src/services/usuarios.service');
const {
  listar,
  obtenerPorId,
  cambiarEstado,
} = require('../../../src/controllers/usuarios.controller');

jest.mock('../../../src/services/usuarios.service');

const crearRespuesta = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// usuario: req.usuario ya existe siempre aquí (autenticarJWT corre antes
// en la ruta real); usuarios.controller.js lo usa para la auditoría y
// para saber quién hace el cambio de estado.
const crearPeticion = ({
  cuerpo = {},
  parametros = {},
  consulta = {},
  usuario = { id: 1 },
} = {}) => ({
  datos: { cuerpo, parametros, consulta },
  usuario,
});

describe('usuarios.controller', () => {
  describe('listar', () => {
    it('responde 200 con la página de usuarios, pasando los filtros ya validados', async () => {
      const pagina = {
        usuarios: [{ id: 1 }, { id: 2 }],
        total: 2,
        pagina: 1,
        porPagina: 20,
        totalPaginas: 1,
      };
      usuariosService.listarUsuarios.mockResolvedValue(pagina);

      const res = crearRespuesta();
      await listar(crearPeticion({ consulta: { rol: 'pendiente' } }), res, jest.fn());

      expect(usuariosService.listarUsuarios).toHaveBeenCalledWith({ rol: 'pendiente' });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(pagina);
    });
  });

  describe('obtenerPorId', () => {
    it('responde 200 con el usuario encontrado', async () => {
      usuariosService.obtenerUsuarioOFallar.mockResolvedValue({ id: 1, nombre: 'Juan' });

      const res = crearRespuesta();
      await obtenerPorId(crearPeticion({ parametros: { id: 1 } }), res, jest.fn());

      expect(usuariosService.obtenerUsuarioOFallar).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ usuario: { id: 1, nombre: 'Juan' } });
    });

    it('propaga el error si el id no existe (404) — sin try/catch, Express 5 lo atrapa solo', async () => {
      const error = new Error('no encontrado');
      usuariosService.obtenerUsuarioOFallar.mockRejectedValue(error);

      await expect(
        obtenerPorId(crearPeticion({ parametros: { id: 999 } }), crearRespuesta(), jest.fn()),
      ).rejects.toThrow(error);
    });
  });

  describe('cambiarEstado', () => {
    it('responde 200 con el usuario actualizado, pasando quién hace el cambio', async () => {
      usuariosService.cambiarEstadoUsuario.mockResolvedValue({ id: 1, activo: false });

      const res = crearRespuesta();
      await cambiarEstado(
        crearPeticion({ parametros: { id: 1 }, cuerpo: { activo: false }, usuario: { id: 7 } }),
        res,
        jest.fn(),
      );

      expect(usuariosService.cambiarEstadoUsuario).toHaveBeenCalledWith(1, false, 7);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ mensaje: 'Estado del usuario actualizado correctamente' }),
      );
    });

    it('propaga el error si intenta desactivarse a sí mismo (409)', async () => {
      const error = new Error('No puedes desactivarte a ti mismo');
      usuariosService.cambiarEstadoUsuario.mockRejectedValue(error);

      await expect(
        cambiarEstado(
          crearPeticion({ parametros: { id: 7 }, cuerpo: { activo: false }, usuario: { id: 7 } }),
          crearRespuesta(),
          jest.fn(),
        ),
      ).rejects.toThrow(error);
    });

    it('propaga el error si el id no existe (404)', async () => {
      const error = new Error('no encontrado');
      usuariosService.cambiarEstadoUsuario.mockRejectedValue(error);

      await expect(
        cambiarEstado(
          crearPeticion({ parametros: { id: 999 }, cuerpo: { activo: false } }),
          crearRespuesta(),
          jest.fn(),
        ),
      ).rejects.toThrow(error);
    });
  });
});
