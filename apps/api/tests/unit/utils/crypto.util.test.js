const { generarHash, compararSeguro } = require('../../../src/utils/crypto.util');

describe('crypto.util', () => {
  describe('generarHash', () => {
    it('siempre produce el mismo hash para el mismo valor', () => {
      expect(generarHash('clave-de-prueba')).toBe(generarHash('clave-de-prueba'));
    });

    it('produce hashes distintos para valores distintos', () => {
      expect(generarHash('a')).not.toBe(generarHash('b'));
    });

    it('devuelve un hash de 64 caracteres hexadecimales (SHA-256)', () => {
      expect(generarHash('cualquier-cosa')).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('compararSeguro', () => {
    it('devuelve true cuando los valores son iguales', () => {
      expect(compararSeguro('igual', 'igual')).toBe(true);
    });

    it('devuelve false cuando los valores difieren', () => {
      expect(compararSeguro('uno', 'otro')).toBe(false);
    });

    it('devuelve false sin lanzar error cuando las longitudes difieren', () => {
      expect(() => compararSeguro('corto', 'un-valor-mucho-mas-largo')).not.toThrow();
      expect(compararSeguro('corto', 'un-valor-mucho-mas-largo')).toBe(false);
    });
  });
});
