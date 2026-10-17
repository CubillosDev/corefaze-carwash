const { crearServicioApiKeys } = require('../../../src/services/apiKeys.service');
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
});
