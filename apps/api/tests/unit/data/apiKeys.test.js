const { construirRegistrosApiKeys } = require('../../../src/data/apiKeys');
const { generarHash } = require('../../../src/utils/crypto.util');

const claves = { postman: 'clave-postman', admin: 'clave-admin', movil: 'clave-movil' };

describe('construirRegistrosApiKeys', () => {
  it('crea un registro por cada cliente, con su hash correspondiente', () => {
    const registros = construirRegistrosApiKeys(claves);

    expect(registros).toHaveLength(3);
    expect(registros[0]).toMatchObject({ cliente: 'Postman / Laboratorio', activa: true });
    expect(registros[0].hash).toBe(generarHash(claves.postman));
  });

  it('nunca guarda la llave original, solo su hash', () => {
    const registros = construirRegistrosApiKeys(claves);

    registros.forEach((registro) => {
      expect(registro.hash).not.toBe(claves.postman);
      expect(registro.hash).not.toBe(claves.admin);
      expect(registro.hash).not.toBe(claves.movil);
    });
  });

  it('todos empiezan activos', () => {
    construirRegistrosApiKeys(claves).forEach((registro) => {
      expect(registro.activa).toBe(true);
    });
  });

  it('devuelve el arreglo y cada registro congelados', () => {
    const registros = construirRegistrosApiKeys(claves);

    expect(Object.isFrozen(registros)).toBe(true);
    expect(Object.isFrozen(registros[0])).toBe(true);
  });

  it('produce hashes distintos para llaves distintas', () => {
    const registros = construirRegistrosApiKeys(claves);
    const hashes = registros.map((registro) => registro.hash);

    expect(new Set(hashes).size).toBe(3);
  });
});
