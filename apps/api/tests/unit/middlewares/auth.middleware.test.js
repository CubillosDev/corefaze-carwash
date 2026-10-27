const usuarios = require('../../../src/data/usuarios');
const { autenticarJWT } = require('../../../src/middlewares/auth.middleware');
const { generarToken } = require('../../../src/utils/jwt.util');
const { NoAutenticado } = require('../../../src/utils/errores');

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const crearPeticion = (encabezadoAuthorization) => ({
  get: jest.fn((nombre) => (nombre === 'Authorization' ? encabezadoAuthorization : undefined)),
});

const ejecutar = (encabezado) => {
  const req = crearPeticion(encabezado);
  const next = jest.fn();
  autenticarJWT(req, {}, next);
  return { req, next };
};

const usuarioDePrueba = { id: 1, email: 'admin@lavadero.com', rol: 'pendiente' };

// Hallazgo de revisión del PR #7: autenticarJWT ya no es puro respecto al
// token, también consulta al usuario actual (obtenerUsuarioPorId) para
// tomar su rol de ahí. Por eso cada prueba necesita un registro real en
// la "tabla" de usuarios, no solo un token con el payload que quiera.
beforeEach(() => {
  usuarios.length = 0;
  usuarios.push({
    id: usuarioDePrueba.id,
    nombre: 'Usuario de prueba',
    email: usuarioDePrueba.email,
    passwordHash: 'irrelevante-para-esta-prueba',
    rol: usuarioDePrueba.rol,
    activo: true,
  });
});

describe('autenticarJWT', () => {
  it('responde 401 sin el header Authorization', () => {
    const { next } = ejecutar(undefined);
    const [error] = next.mock.calls[0];

    expect(error).toBeInstanceOf(NoAutenticado);
    expect(error.message).toBe('Token de autenticación requerido');
  });

  it.each([
    ['sin esquema Bearer', 'Token abc123'],
    ['sin token', 'Bearer'],
  ])('responde 401 con formato inválido: %s', (_descripcion, encabezado) => {
    const { next } = ejecutar(encabezado);
    const [error] = next.mock.calls[0];
    expect(error.message).toBe('Formato de token inválido');
  });
  it('responde 401 con un token con firma alterada', () => {
    const token = generarToken(usuarioDePrueba);
    const tokenAlterado = `${token.slice(0, -1)}x`;

    const { next } = ejecutar(`Bearer ${tokenAlterado}`);
    const [error] = next.mock.calls[0];
    expect(error.message).toBe('Token inválido');
  });

  it('responde 401 con mensaje distinto para un token expirado', async () => {
    const token = generarToken(usuarioDePrueba, { expiresIn: '1ms' });
    await esperar(50);

    const { next } = ejecutar(`Bearer ${token}`);
    const [error] = next.mock.calls[0];
    expect(error.message).toBe('Token expirado');
  });

  it('deja pasar y expone req.usuario con un token válido', () => {
    const token = generarToken(usuarioDePrueba);

    const { req, next } = ejecutar(`Bearer ${token}`);

    expect(next).toHaveBeenCalledWith();
    expect(req.usuario).toEqual({ id: 1, email: usuarioDePrueba.email, rol: usuarioDePrueba.rol });
  });

  describe('el rol sale del usuario actual, no del payload del token (hallazgo de revisión del PR #7)', () => {
    it('responde 401 "Usuario no encontrado" si el id del token no existe', () => {
      const token = generarToken({ id: 999, email: 'nadie@lavadero.com', rol: 'superadmin' });

      const { next } = ejecutar(`Bearer ${token}`);
      const [error] = next.mock.calls[0];

      expect(error).toBeInstanceOf(NoAutenticado);
      expect(error.message).toBe('Usuario no encontrado');
    });

    it('responde 401 "Usuario deshabilitado" si el usuario actual está inactivo', () => {
      usuarios[0].activo = false;
      const token = generarToken(usuarioDePrueba);

      const { next } = ejecutar(`Bearer ${token}`);
      const [error] = next.mock.calls[0];

      expect(error).toBeInstanceOf(NoAutenticado);
      expect(error.message).toBe('Usuario deshabilitado');
    });

    it('usa el rol ACTUAL del usuario aunque el token traiga otro: revocación inmediata, sin esperar a que expire', () => {
      const token = generarToken(usuarioDePrueba); // token emitido con rol "pendiente"
      usuarios[0].rol = 'superadmin'; // el rol cambia DESPUÉS de emitir el token

      const { req, next } = ejecutar(`Bearer ${token}`);

      expect(next).toHaveBeenCalledWith();
      expect(req.usuario.rol).toBe('superadmin');
    });

    it('el id y el email siguen viniendo del token, no del registro actual', () => {
      const token = generarToken(usuarioDePrueba);
      usuarios[0].email = 'email-cambiado-despues@lavadero.com';

      const { req } = ejecutar(`Bearer ${token}`);

      expect(req.usuario.email).toBe(usuarioDePrueba.email);
    });
  });
});
