const usuarios = require('../../../src/data/usuarios');

describe('data/usuarios', () => {
  it('empieza como un arreglo vacío', () => {
    expect(Array.isArray(usuarios)).toBe(true);
    expect(usuarios).toHaveLength(0);
  });

  it('no viene congelado: el service necesita poder agregar usuarios', () => {
    expect(Object.isFrozen(usuarios)).toBe(false);
  });
});
