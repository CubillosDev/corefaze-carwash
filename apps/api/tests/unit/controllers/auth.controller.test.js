const usuariosService = require('../../../src/services/usuarios.service');
const { registrar, login } = require('../../../src/controllers/auth.controller');
const { Conflicto, NoAutenticado, AccesoDenegado } = require('../../../src/utils/errores');

jest.mock('../../../src/services/usuarios.service');

const crearRespuesta = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const crearPeticion = (cuerpo) => ({ datos: { cuerpo } });

const datosDeRegistro = {
  nombre: 'Administrador Lavadero',
  email: 'admin@lavadero.com',
  password: 'ClaveSegura2026!',
  rol: 'superadmin',
};

describe('auth.controller', () => {
  describe('registrar', () => {
    it('responde 201 con el usuario creado cuando el email no existe', async () => {
      usuariosService.obtenerUsuarioPorEmail.mockReturnValue(null);
      usuariosService.crearUsuario.mockResolvedValue({ id: 1, ...datosDeRegistro });

      const req = crearPeticion(datosDeRegistro);
      const res = crearRespuesta();
      const next = jest.fn();

      await registrar(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ mensaje: 'Usuario registrado correctamente' }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('pasa un Conflicto (409) cuando el email ya existe', async () => {
      usuariosService.obtenerUsuarioPorEmail.mockReturnValue({ id: 1 });

      const req = crearPeticion(datosDeRegistro);
      const res = crearRespuesta();
      const next = jest.fn();

      await registrar(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Conflicto));
      expect(res.status).not.toHaveBeenCalled();
      expect(usuariosService.crearUsuario).not.toHaveBeenCalled();
    });

    it('pasa el error al siguiente manejador si el service falla inesperadamente', async () => {
      usuariosService.obtenerUsuarioPorEmail.mockReturnValue(null);
      usuariosService.crearUsuario.mockRejectedValue(new Error('fallo inesperado'));

      const req = crearPeticion(datosDeRegistro);
      const res = crearRespuesta();
      const next = jest.fn();

      await registrar(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('login', () => {
    const credenciales = { email: 'admin@lavadero.com', password: 'ClaveSegura2026!' };

    it('responde 200 con el usuario cuando las credenciales son correctas', async () => {
      usuariosService.verificarCredenciales.mockResolvedValue({
        id: 1,
        email: credenciales.email,
        rol: 'superadmin',
        activo: true,
      });

      const req = crearPeticion(credenciales);
      const res = crearRespuesta();
      const next = jest.fn();

      await login(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ mensaje: 'Autenticación correcta' }),
      );
    });

    it('pasa un NoAutenticado (401) cuando las credenciales son inválidas', async () => {
      usuariosService.verificarCredenciales.mockResolvedValue(null);

      const req = crearPeticion(credenciales);
      const res = crearRespuesta();
      const next = jest.fn();

      await login(req, res, next);

      const [error] = next.mock.calls[0];
      expect(error).toBeInstanceOf(NoAutenticado);
      expect(error.message).toBe('Credenciales inválidas');
    });

    it('pasa un AccesoDenegado (403) cuando el usuario está desactivado', async () => {
      usuariosService.verificarCredenciales.mockResolvedValue({
        id: 1,
        email: credenciales.email,
        rol: 'superadmin',
        activo: false,
      });

      const req = crearPeticion(credenciales);
      const res = crearRespuesta();
      const next = jest.fn();

      await login(req, res, next);

      const [error] = next.mock.calls[0];
      expect(error).toBeInstanceOf(AccesoDenegado);
      expect(error.message).toBe('Usuario deshabilitado');
    });

    it('nunca incluye passwordHash en la respuesta de login', async () => {
      usuariosService.verificarCredenciales.mockResolvedValue({
        id: 1,
        email: credenciales.email,
        rol: 'superadmin',
        activo: true,
      });

      const req = crearPeticion(credenciales);
      const res = crearRespuesta();

      await login(req, res, jest.fn());

      const cuerpoEnviado = res.json.mock.calls[0][0];
      expect(cuerpoEnviado.usuario.passwordHash).toBeUndefined();
    });
  });
});
