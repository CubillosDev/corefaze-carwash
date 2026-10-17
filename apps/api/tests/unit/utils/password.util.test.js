const { generarPasswordHash, verificarPassword } = require('../../../src/utils/password.util');

// bcrypt es deliberadamente lento; una sola ejecución puede tardar unos
// cientos de milisegundos, así que le damos más tiempo del límite por defecto de Jest.
jest.setTimeout(10000);

describe('password.util', () => {
  describe('generarPasswordHash', () => {
    it('genera un hash con el formato de bcrypt ($2b$...)', async () => {
      const hash = await generarPasswordHash('ClaveSegura2026!');
      expect(hash).toMatch(/^\$2[aby]\$\d{2}\$/);
    });

    it('nunca devuelve la contraseña original', async () => {
      const password = 'ClaveSegura2026!';
      const hash = await generarPasswordHash(password);
      expect(hash).not.toBe(password);
      expect(hash).not.toContain(password);
    });

    it('genera hashes distintos para la misma contraseña (salt aleatorio)', async () => {
      const hashA = await generarPasswordHash('ClaveSegura2026!');
      const hashB = await generarPasswordHash('ClaveSegura2026!');
      expect(hashA).not.toBe(hashB);
    });
  });

  describe('verificarPassword', () => {
    it('devuelve true con la contraseña correcta', async () => {
      const hash = await generarPasswordHash('ClaveSegura2026!');
      expect(await verificarPassword('ClaveSegura2026!', hash)).toBe(true);
    });

    it('devuelve false con una contraseña incorrecta', async () => {
      const hash = await generarPasswordHash('ClaveSegura2026!');
      expect(await verificarPassword('OtraClave123!', hash)).toBe(false);
    });

    it('verifica correctamente incluso con salts distintos entre sí', async () => {
      const hashA = await generarPasswordHash('MismaClave2026!');
      const hashB = await generarPasswordHash('MismaClave2026!');

      expect(await verificarPassword('MismaClave2026!', hashA)).toBe(true);
      expect(await verificarPassword('MismaClave2026!', hashB)).toBe(true);
    });
  });
});
