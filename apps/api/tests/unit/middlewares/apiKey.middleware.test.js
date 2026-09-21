const { crearMiddlewareApiKey } = require('../../../src/middlewares/apiKey.middleware');
const { NoAutenticado } = require('../../../src/utils/errores');

const LLAVE_VALIDA = 'k'.repeat(40);
const exigirApiKey = crearMiddlewareApiKey(LLAVE_VALIDA);

// Petición falsa que devuelve `valor` cuando se le pide el header X-API-Key
const crearPeticion = (valor) => ({
  get: jest.fn((nombreHeader) => (nombreHeader === 'X-API-Key' ? valor : undefined)),
});

const ejecutar = (valor) => {
  const next = jest.fn();
  exigirApiKey(crearPeticion(valor), {}, next);
  return next;
};

describe('crearMiddlewareApiKey', () => {
  it('deja pasar la petición con la llave correcta', () => {
    expect(ejecutar(LLAVE_VALIDA)).toHaveBeenCalledWith();
  });

  it.each([
    ['sin el header', undefined],
    ['con el header vacío', ''],
    ['con una llave incorrecta', 'x'.repeat(40)],
    ['con una llave casi igual', `${'k'.repeat(39)}x`],
    ['con una llave más corta', 'k'.repeat(5)],
    ['con una llave más larga', 'k'.repeat(200)],
    ['con distinta capitalización', LLAVE_VALIDA.toUpperCase()],
  ])('responde 401 %s', (_descripcion, llave) => {
    const next = ejecutar(llave);

    const [error] = next.mock.calls[0];
    expect(error).toBeInstanceOf(NoAutenticado);
    expect(error.estado).toBe(401);
  });

  it('no incluye ninguna llave en el mensaje de error', () => {
    const llaveIntentada = 'intento-de-llave-robada';
    const [error] = ejecutar(llaveIntentada).mock.calls[0];

    expect(error.message).not.toContain(llaveIntentada);
    expect(error.message).not.toContain(LLAVE_VALIDA);
  });

  it('exige una API Key esperada no vacía al crearse', () => {
    expect(() => crearMiddlewareApiKey('')).toThrow(/no vacía/);
    expect(() => crearMiddlewareApiKey(undefined)).toThrow(/no vacía/);
  });
});
