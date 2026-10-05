const { generarToken, verificarToken } = require('../../../src/utils/jwt.util');

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const usuarioDePrueba = { id: 1, email: 'admin@lavadero.com', rol: 'pendiente' };

describe('jwt.util', () => {
  describe('generarToken', () => {
    it('genera un token con tres partes separadas por punto', () => {
      const token = generarToken(usuarioDePrueba);
      expect(token.split('.')).toHaveLength(3);
    });

    it('nunca incluye la contraseña en el token', () => {
      const token = generarToken({ ...usuarioDePrueba, password: 'ClaveSegura2026!' });
      expect(token).not.toContain('ClaveSegura');
    });
  });

  describe('verificarToken', () => {
    it('devuelve un payload con sub, email y rol', () => {
      const token = generarToken(usuarioDePrueba);
      const payload = verificarToken(token);

      expect(payload.sub).toBe('1');
      expect(payload.email).toBe(usuarioDePrueba.email);
      expect(payload.rol).toBe(usuarioDePrueba.rol);
    });

    it('rechaza un token alterado (firma inválida)', () => {
      const token = generarToken(usuarioDePrueba);
      const tokenAlterado = `${token.slice(0, -1)}${token.endsWith('a') ? 'b' : 'a'}`;

      expect(() => verificarToken(tokenAlterado)).toThrow();
    });

    it('rechaza un token expirado', async () => {
      const token = generarToken(usuarioDePrueba, { expiresIn: '1ms' });
      await esperar(50);

      expect(() => verificarToken(token)).toThrow(
        expect.objectContaining({ name: 'TokenExpiredError' }),
      );
    });

    it('decodificar (sin verificar) no es lo mismo que confiar en el token', () => {
      // jwt.decode() lee el contenido sin comprobar la firma; se usa aquí
      // solo para demostrar la diferencia (Parte 20 del laboratorio), nunca
      // como mecanismo real de autenticación.
      const jwt = require('jsonwebtoken');
      const token = generarToken(usuarioDePrueba);
      const decodificado = jwt.decode(token);

      expect(decodificado.email).toBe(usuarioDePrueba.email);
      // decode() no lanza ni siquiera con un token con firma inválida:
      const tokenAlterado = `${token.slice(0, -1)}x`;
      expect(() => jwt.decode(tokenAlterado)).not.toThrow();
    });
  });
});
