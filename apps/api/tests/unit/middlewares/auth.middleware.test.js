const usuariosService = require('../../../src/services/usuarios.service');
const { autenticarJWT } = require('../../../src/middlewares/auth.middleware');
const { generarToken } = require('../../../src/utils/jwt.util');
const { NoAutenticado } = require('../../../src/utils/errores');

jest.mock('../../../src/services/usuarios.service');

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const crearPeticion = (encabezadoAuthorization) => ({
  get: jest.fn((nombre) => (nombre === 'Authorization' ? encabezadoAuthorization : undefined)),
});

const ejecutar = async (encabezado) => {
  const req = crearPeticion(encabezado);
  const next = jest.fn();
  await autenticarJWT(req, {}, next);
  return { req, next };
};

const usuarioDePrueba = { id: 1, email: 'admin@lavadero.com', rol: 'pendiente' };

// Hallazgo de revisión del PR #7: autenticarJWT ya no es puro respecto al
// token, también consulta al usuario actual (obtenerUsuarioPorId) para
// tomar su rol de ahí. Es una prueba de unidad del middleware, no del
// service (eso lo cubre usuarios.service.test.js): se mockea el service
// en vez de escribir contra el Supabase local.
beforeEach(() => {
  usuariosService.obtenerUsuarioPorId.mockResolvedValue({
    id: usuarioDePrueba.id,
    nombre: 'Usuario de prueba',
    email: usuarioDePrueba.email,
    rol: usuarioDePrueba.rol,
    activo: true,
  });
});

describe('autenticarJWT', () => {
  it('responde 401 sin el header Authorization', async () => {
    const { next } = await ejecutar(undefined);
    const [error] = next.mock.calls[0];

    expect(error).toBeInstanceOf(NoAutenticado);
    expect(error.message).toBe('Token de autenticación requerido');
  });

  it.each([
    ['sin esquema Bearer', 'Token abc123'],
    ['sin token', 'Bearer'],
  ])('responde 401 con formato inválido: %s', async (_descripcion, encabezado) => {
    const { next } = await ejecutar(encabezado);
    const [error] = next.mock.calls[0];
    expect(error.message).toBe('Formato de token inválido');
  });

  it('responde 401 con un token con firma alterada', async () => {
    const token = generarToken(usuarioDePrueba);
    const tokenAlterado = `${token.slice(0, -1)}x`;

    const { next } = await ejecutar(`Bearer ${tokenAlterado}`);
    const [error] = next.mock.calls[0];
    expect(error.message).toBe('Token inválido');
  });

  it('responde 401 con mensaje distinto para un token expirado', async () => {
    const token = generarToken(usuarioDePrueba, { expiresIn: '1ms' });
    await esperar(50);

    const { next } = await ejecutar(`Bearer ${token}`);
    const [error] = next.mock.calls[0];
    expect(error.message).toBe('Token expirado');
  });

  it('deja pasar y expone req.usuario con un token válido', async () => {
    const token = generarToken(usuarioDePrueba);

    const { req, next } = await ejecutar(`Bearer ${token}`);

    expect(next).toHaveBeenCalledWith();
    expect(req.usuario).toEqual({ id: 1, email: usuarioDePrueba.email, rol: usuarioDePrueba.rol });
  });

  describe('el rol sale del usuario actual, no del payload del token (hallazgo de revisión del PR #7)', () => {
    it('responde 401 "Usuario no encontrado" si el id del token no existe', async () => {
      usuariosService.obtenerUsuarioPorId.mockResolvedValue(null);
      const token = generarToken({ id: 999, email: 'nadie@lavadero.com', rol: 'superadmin' });

      const { next } = await ejecutar(`Bearer ${token}`);
      const [error] = next.mock.calls[0];

      expect(error).toBeInstanceOf(NoAutenticado);
      expect(error.message).toBe('Usuario no encontrado');
    });

    it('responde 401 "Usuario deshabilitado" si el usuario actual está inactivo', async () => {
      usuariosService.obtenerUsuarioPorId.mockResolvedValue({ ...usuarioDePrueba, activo: false });
      const token = generarToken(usuarioDePrueba);

      const { next } = await ejecutar(`Bearer ${token}`);
      const [error] = next.mock.calls[0];

      expect(error).toBeInstanceOf(NoAutenticado);
      expect(error.message).toBe('Usuario deshabilitado');
    });

    it('usa el rol ACTUAL del usuario aunque el token traiga otro: revocación inmediata, sin esperar a que expire', async () => {
      const token = generarToken(usuarioDePrueba); // token emitido con rol "pendiente"
      usuariosService.obtenerUsuarioPorId.mockResolvedValue({
        ...usuarioDePrueba,
        rol: 'superadmin', // el rol cambia DESPUÉS de emitir el token
        activo: true,
      });

      const { req, next } = await ejecutar(`Bearer ${token}`);

      expect(next).toHaveBeenCalledWith();
      expect(req.usuario.rol).toBe('superadmin');
    });

    it('el id y el email siguen viniendo del token, no del registro actual', async () => {
      const token = generarToken(usuarioDePrueba);
      usuariosService.obtenerUsuarioPorId.mockResolvedValue({
        ...usuarioDePrueba,
        email: 'email-cambiado-despues@lavadero.com',
        activo: true,
      });

      const { req } = await ejecutar(`Bearer ${token}`);

      expect(req.usuario.email).toBe(usuarioDePrueba.email);
    });
  });

  it('propaga el error si obtenerUsuarioPorId falla (infraestructura), nunca lo traduce a "Token inválido"', async () => {
    const error = new Error('fallo de conexión con Supabase');
    usuariosService.obtenerUsuarioPorId.mockRejectedValue(error);
    const token = generarToken(usuarioDePrueba);

    const req = crearPeticion(`Bearer ${token}`);
    await expect(autenticarJWT(req, {}, jest.fn())).rejects.toThrow(error);
  });
});
