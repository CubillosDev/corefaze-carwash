const { crearServicioApiKeys } = require('../../../src/services/apiKeys.service');
const { construirRegistrosApiKeys } = require('../../../src/data/apiKeys');
const { generarHash } = require('../../../src/utils/crypto.util');

const CLAVE_ACTIVA = 'clave-activa-de-prueba-0123456789';
const CLAVE_INACTIVA = 'clave-inactiva-de-prueba-0123456789';

const registrosDePrueba = [
  { id: 1, cliente: 'Cliente activo', hash: generarHash(CLAVE_ACTIVA), activa: true },
  { id: 2, cliente: 'Cliente inactivo', hash: generarHash(CLAVE_INACTIVA), activa: false },
];

const servicio = crearServicioApiKeys(registrosDePrueba);

describe('apiKeys.service', () => {
  it('encuentra al cliente correcto para una llave válida', () => {
    expect(servicio.buscarClientePorApiKey(CLAVE_ACTIVA)).toEqual({
      id: 1,
      cliente: 'Cliente activo',
      activa: true,
    });
  });

  it('reporta activa: false para un cliente desactivado', () => {
    expect(servicio.buscarClientePorApiKey(CLAVE_INACTIVA)).toEqual({
      id: 2,
      cliente: 'Cliente inactivo',
      activa: false,
    });
  });

  it('devuelve null para una llave que no existe', () => {
    expect(servicio.buscarClientePorApiKey('llave-inventada')).toBeNull();
  });

  it('nunca expone el hash almacenado', () => {
    const resultado = servicio.buscarClientePorApiKey(CLAVE_ACTIVA);
    expect(resultado.hash).toBeUndefined();
  });

  describe('con las 4 llaves reales (SCRUM-140: API_KEY_WEB)', () => {
    const claves = {
      postman: 'clave-postman-0123456789',
      admin: 'clave-admin-0123456789',
      movil: 'clave-movil-0123456789',
      web: 'clave-web-0123456789',
    };
    const servicioReal = crearServicioApiKeys(construirRegistrosApiKeys(claves));

    it('encuentra al cliente "Panel web" con la API Key web', () => {
      expect(servicioReal.buscarClientePorApiKey(claves.web)).toEqual({
        id: 4,
        cliente: 'Panel web',
        activa: true,
      });
    });

    it('rotar (cambiar) la llave web no afecta a Postman ni al móvil', () => {
      const clavesConWebRotada = { ...claves, web: 'clave-web-rotada-0123456789' };
      const servicioConWebRotada = crearServicioApiKeys(
        construirRegistrosApiKeys(clavesConWebRotada),
      );

      // La llave vieja ya no sirve.
      expect(servicioConWebRotada.buscarClientePorApiKey(claves.web)).toBeNull();
      // La nueva sí.
      expect(servicioConWebRotada.buscarClientePorApiKey(clavesConWebRotada.web)).toMatchObject({
        cliente: 'Panel web',
      });
      // Postman y móvil, sin cambios, siguen funcionando con sus propias llaves.
      expect(servicioConWebRotada.buscarClientePorApiKey(claves.postman)).toMatchObject({
        cliente: 'Postman / Laboratorio',
      });
      expect(servicioConWebRotada.buscarClientePorApiKey(claves.movil)).toMatchObject({
        cliente: 'Aplicación móvil',
      });
    });
  });
});
