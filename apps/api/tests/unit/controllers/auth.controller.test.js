const usuariosService = require('../../../src/services/usuarios.service');
const {
  registrar,
  login,
  perfil,
  asignarRol,
} = require('../../../src/controllers/auth.controller');
const {
  Conflicto,
  NoEncontrado,
  NoAutenticado,
  AccesoDenegado,
} = require('../../../src/utils/errores');

jest.mock('../../../src/services/usuarios.service');
jest.mock('../../../src/utils/jwt.util');

const { generarToken } = require('../../../src/utils/jwt.util');

const crearRespuesta = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const crearPeticion = ({
  cuerpo = {},
  parametros = {},
  usuario = { id: 1, email: 'administrador@lavadero.com', rol: 'administrador' },
} = {}) => ({ datos: { cuerpo, parametros }, usuario });

const datosDeRegistro = {
  nombre: 'Administrador Lavadero',
  email: 'admin@lavadero.com',
  password: 'ClaveSegura2026!',
  rol: 'superadmin',
};

describe('auth.controller', () => {
  describe('registrar', () => {
    it('responde 201 con el usuario creado', async () => {
      usuariosService.crearUsuario.mockResolvedValue({ id: 1, ...datosDeRegistro });

      const res = crearRespuesta();
      await registrar(crearPeticion({ cuerpo: datosDeRegistro }), res, jest.fn());

      expect(usuariosService.crearUsuario).toHaveBeenCalledWith(datosDeRegistro);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ mensaje: 'Usuario registrado correctamente' }),
      );
    });

    it('propaga el error si el email ya existe (409) — lo rechaza el service, no un pre-check aquí', async () => {
      const error = new Conflicto('Ya existe un usuario con ese correo electrónico');
      usuariosService.crearUsuario.mockRejectedValue(error);

      await expect(
        registrar(crearPeticion({ cuerpo: datosDeRegistro }), crearRespuesta(), jest.fn()),
      ).rejects.toThrow(error);
    });

    it('propaga el error si el service falla inesperadamente', async () => {
      const error = new Error('fallo inesperado');
      usuariosService.crearUsuario.mockRejectedValue(error);

      await expect(
        registrar(crearPeticion({ cuerpo: datosDeRegistro }), crearRespuesta(), jest.fn()),
      ).rejects.toThrow(error);
    });
  });

  describe('login', () => {
    const credenciales = { email: 'admin@lavadero.com', password: 'ClaveSegura2026!' };

    it('responde 200 con el usuario y un token cuando las credenciales son correctas', async () => {
      usuariosService.verificarCredenciales.mockResolvedValue({
        id: 1,
        email: credenciales.email,
        rol: 'pendiente',
        activo: true,
      });
      generarToken.mockReturnValue('token-de-prueba');

      const res = crearRespuesta();
      await login(crearPeticion({ cuerpo: credenciales }), res, jest.fn());

      expect(generarToken).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1, email: credenciales.email }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ mensaje: 'Autenticación correcta', token: 'token-de-prueba' }),
      );
    });

    it('propaga NoAutenticado (401) cuando las credenciales son inválidas', async () => {
      usuariosService.verificarCredenciales.mockResolvedValue(null);

      await expect(
        login(crearPeticion({ cuerpo: credenciales }), crearRespuesta(), jest.fn()),
      ).rejects.toThrow(NoAutenticado);
    });

    it('propaga AccesoDenegado (403) cuando el usuario está desactivado', async () => {
      usuariosService.verificarCredenciales.mockResolvedValue({
        id: 1,
        email: credenciales.email,
        rol: 'superadmin',
        activo: false,
      });

      await expect(
        login(crearPeticion({ cuerpo: credenciales }), crearRespuesta(), jest.fn()),
      ).rejects.toThrow(AccesoDenegado);
    });

    it('nunca incluye passwordHash en la respuesta de login', async () => {
      usuariosService.verificarCredenciales.mockResolvedValue({
        id: 1,
        email: credenciales.email,
        rol: 'superadmin',
        activo: true,
      });

      const res = crearRespuesta();
      await login(crearPeticion({ cuerpo: credenciales }), res, jest.fn());

      const cuerpoEnviado = res.json.mock.calls[0][0];
      expect(cuerpoEnviado.usuario.passwordHash).toBeUndefined();
    });
  });

  describe('perfil', () => {
    it('responde 200 con req.usuario y req.clienteApi', () => {
      const req = {
        usuario: { id: 1, email: 'admin@lavadero.com', rol: 'pendiente' },
        clienteApi: { id: 1, nombre: 'Postman / Laboratorio' },
      };
      const res = crearRespuesta();

      perfil(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        mensaje: 'Usuario autenticado mediante JWT',
        usuario: req.usuario,
        clienteApi: req.clienteApi,
      });
    });
  });

  describe('asignarRol', () => {
    it('responde 200 con el usuario actualizado, usando el id del usuario autenticado', async () => {
      usuariosService.asignarRol.mockResolvedValue({ id: 2, rol: 'administrador' });

      const res = crearRespuesta();
      await asignarRol(
        crearPeticion({
          parametros: { id: 2 },
          cuerpo: { rol: 'administrador' },
          usuario: { id: 1, email: 'dueno@carwash.test', rol: 'superadmin' },
        }),
        res,
        jest.fn(),
      );

      expect(usuariosService.asignarRol).toHaveBeenCalledWith(2, 'administrador', 1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ mensaje: 'Rol asignado correctamente' }),
      );
    });

    it('propaga el error si el id no existe (404)', async () => {
      const error = new NoEncontrado('Usuario no encontrado');
      usuariosService.asignarRol.mockRejectedValue(error);

      await expect(
        asignarRol(
          crearPeticion({ parametros: { id: 999 }, cuerpo: { rol: 'administrador' } }),
          crearRespuesta(),
          jest.fn(),
        ),
      ).rejects.toThrow(error);
    });

    it('propaga el error si degradar deja el sistema sin superadmin activo (409)', async () => {
      const error = new Conflicto('No puede quedar el sistema sin ningún superadmin activo');
      usuariosService.asignarRol.mockRejectedValue(error);

      await expect(
        asignarRol(
          crearPeticion({ parametros: { id: 1 }, cuerpo: { rol: 'administrador' } }),
          crearRespuesta(),
          jest.fn(),
        ),
      ).rejects.toThrow(error);
    });
  });
});
