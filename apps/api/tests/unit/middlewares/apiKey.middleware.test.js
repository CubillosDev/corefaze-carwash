const { crearMiddlewareApiKey } = require('../../../src/middlewares/apiKey.middleware');
const { crearServicioApiKeys } = require('../../../src/services/apiKeys.service');
const { generarHash } = require('../../../src/utils/crypto.util');
const { NoAutenticado, AccesoDenegado } = require('../../../src/utils/errores');

const CLAVE_ACTIVA = 'clave-activa-de-prueba-0123456789';
const CLAVE_INACTIVA = 'clave-inactiva-de-prueba-0123456789';

const registros = [
  { id: 1, cliente: 'Postman', hash: generarHash(CLAVE_ACTIVA), activa: true },
  { id: 2, cliente: 'Móvil', hash: generarHash(CLAVE_INACTIVA), activa: false },
];

const middleware = crearMiddlewareApiKey(crearServicioApiKeys(registros));

const crearPeticion = (valor) => ({
  get: jest.fn((nombreHeader) => (nombreHeader === 'X-API-Key' ? valor : undefined)),
});

const ejecutar = (valor) => {
  const req = crearPeticion(valor);
  const next = jest.fn();
  middleware(req, {}, next);
  return { req, next };
};

describe('crearMiddlewareApiKey', () => {
  it('responde 401 sin el header (API Key requerida)', () => {
    const { next } = ejecutar(undefined);
    const [error] = next.mock.calls[0];

    expect(error).toBeInstanceOf(NoAutenticado);
    expect(error.message).toBe('API Key requerida');
  });

  it('responde 401 con una llave que no existe (API Key inválida)', () => {
    const { next } = ejecutar('llave-inventada');
    const [error] = next.mock.calls[0];

    expect(error).toBeInstanceOf(NoAutenticado);
    expect(error.message).toBe('API Key inválida');
  });

  it('responde 403 con una llave válida pero desactivada', () => {
    const { next } = ejecutar(CLAVE_INACTIVA);
    const [error] = next.mock.calls[0];

    expect(error).toBeInstanceOf(AccesoDenegado);
    expect(error.estado).toBe(403);
  });

  it('deja pasar y expone req.clienteApi con una llave válida y activa', () => {
    const { req, next } = ejecutar(CLAVE_ACTIVA);

    expect(next).toHaveBeenCalledWith();
    expect(req.clienteApi).toEqual({ id: 1, nombre: 'Postman' });
  });

  it('no expone el hash ni la llave original en req.clienteApi', () => {
    const { req } = ejecutar(CLAVE_ACTIVA);

    expect(JSON.stringify(req.clienteApi)).not.toContain(CLAVE_ACTIVA);
  });
});
