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
});
