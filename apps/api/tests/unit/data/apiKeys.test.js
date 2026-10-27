const { construirRegistrosApiKeys } = require('../../../src/data/apiKeys');
const { generarHash } = require('../../../src/utils/crypto.util');

const claves = {
  postman: 'clave-postman',
  admin: 'clave-admin',
  movil: 'clave-movil',
  web: 'clave-web',
};

describe('construirRegistrosApiKeys', () => {
  it('crea un registro por cada cliente, con su hash correspondiente', () => {
    const registros = construirRegistrosApiKeys(claves);

    expect(registros).toHaveLength(4);
    expect(registros[0]).toMatchObject({ cliente: 'Postman / Laboratorio', activa: true });
    expect(registros[0].hash).toBe(generarHash(claves.postman));
  });

  it('agrega un cuarto registro "Panel web" con el hash de la llave web (SCRUM-140)', () => {
    const registros = construirRegistrosApiKeys(claves);

    expect(registros[3]).toMatchObject({ id: 4, cliente: 'Panel web', activa: true });
    expect(registros[3].hash).toBe(generarHash(claves.web));
  });

  it('mantiene los ids 1/2/3 existentes sin cambios al agregar el cuarto registro', () => {
    const registros = construirRegistrosApiKeys(claves);

    expect(registros.map((registro) => registro.id)).toEqual([1, 2, 3, 4]);
  });

  it('nunca guarda la llave original, solo su hash', () => {
    const registros = construirRegistrosApiKeys(claves);

    registros.forEach((registro) => {
      expect(registro.hash).not.toBe(claves.postman);
      expect(registro.hash).not.toBe(claves.admin);
      expect(registro.hash).not.toBe(claves.movil);
      expect(registro.hash).not.toBe(claves.web);
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

    expect(new Set(hashes).size).toBe(4);
  });
});
