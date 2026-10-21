const { cargarConfiguracion } = require('../../../src/config/env');

const variablesValidas = Object.freeze({
  NODE_ENV: 'development',
  PORT: '3000',
  API_KEY_POSTMAN: 'a'.repeat(32),
  API_KEY_ADMIN: 'b'.repeat(32),
  API_KEY_MOVIL: 'c'.repeat(32),
  JWT_SECRET: 'd'.repeat(32),
  ALLOWED_ORIGIN: 'http://localhost:5173',
});

// Parte de unas variables válidas y cambia solo lo que la prueba necesita
const conCambios = (cambios) => ({ ...variablesValidas, ...cambios });

describe('cargarConfiguracion', () => {
  describe('con variables válidas', () => {
    it('devuelve la configuración con los tipos correctos', () => {
      expect(cargarConfiguracion(variablesValidas)).toEqual({
        entorno: 'development',
        puerto: 3000,
        apiKeys: { postman: 'a'.repeat(32), admin: 'b'.repeat(32), movil: 'c'.repeat(32) },
        jwt: { secret: 'd'.repeat(32), expiresIn: '1h' },
        origenPermitido: 'http://localhost:5173',
        superadmin: null,
      });
    });

    it('usa development y el puerto 3000 cuando no se definen', () => {
      const configuracion = cargarConfiguracion(
        conCambios({ NODE_ENV: undefined, PORT: undefined }),
      );

      expect(configuracion.entorno).toBe('development');
      expect(configuracion.puerto).toBe(3000);
    });

    it('normaliza el origen quitando la barra final', () => {
      const configuracion = cargarConfiguracion(
        conCambios({ ALLOWED_ORIGIN: 'http://localhost:5173/' }),
      );

      expect(configuracion.origenPermitido).toBe('http://localhost:5173');
    });

    it('devuelve un objeto congelado', () => {
      expect(Object.isFrozen(cargarConfiguracion(variablesValidas))).toBe(true);
    });

    it('lee process.env cuando no recibe parámetros', () => {
      // Los valores los pone tests/setupEnv.js
      expect(cargarConfiguracion().entorno).toBe('test');
    });
  });

  describe('con variables inválidas', () => {
    it.each([
      ['NODE_ENV desconocido', { NODE_ENV: 'produccion' }, /NODE_ENV/],
      ['PORT no numérico', { PORT: 'abc' }, /PORT/],
      ['PORT decimal', { PORT: '30.5' }, /PORT/],
      ['PORT en cero', { PORT: '0' }, /PORT/],
      ['PORT fuera de rango', { PORT: '70000' }, /PORT/],
      ['API_KEY_POSTMAN ausente', { API_KEY_POSTMAN: undefined }, /API_KEY_POSTMAN es obligatoria/],
      ['API_KEY_ADMIN ausente', { API_KEY_ADMIN: undefined }, /API_KEY_ADMIN es obligatoria/],
      ['API_KEY_MOVIL ausente', { API_KEY_MOVIL: undefined }, /API_KEY_MOVIL es obligatoria/],
      ['JWT_SECRET ausente', { JWT_SECRET: undefined }, /JWT_SECRET es obligatoria/],
      ['JWT_SECRET demasiado corto', { JWT_SECRET: 'corto' }, /JWT_SECRET.*al menos 32 caracteres/],
      [
        'API_KEY_POSTMAN demasiado corta',
        { API_KEY_POSTMAN: 'corta' },
        /API_KEY_POSTMAN.*al menos 32 caracteres/,
      ],
      [
        'API_KEY_POSTMAN con el valor de ejemplo',
        { API_KEY_POSTMAN: 'REEMPLAZAR_CON_API_KEY_SEGURA000' },
        /valor de ejemplo/,
      ],
      ['ALLOWED_ORIGIN ausente', { ALLOWED_ORIGIN: undefined }, /ALLOWED_ORIGIN es obligatoria/],
      ['ALLOWED_ORIGIN sin protocolo', { ALLOWED_ORIGIN: 'localhost:5173' }, /URL http\(s\)/],
      ['ALLOWED_ORIGIN con otro protocolo', { ALLOWED_ORIGIN: 'ftp://sitio.com' }, /URL http\(s\)/],
    ])('rechaza %s', (_descripcion, cambios, mensajeEsperado) => {
      expect(() => cargarConfiguracion(conCambios(cambios))).toThrow(mensajeEsperado);
    });

    it('reporta todos los errores juntos, no solo el primero', () => {
      expect(() => cargarConfiguracion({})).toThrow(/API_KEY[\s\S]*ALLOWED_ORIGIN/);
    });

    it('usa 1h como JWT_EXPIRES_IN por defecto', () => {
      const configuracion = cargarConfiguracion(conCambios({ JWT_EXPIRES_IN: undefined }));
      expect(configuracion.jwt.expiresIn).toBe('1h');
    });

    it('respeta un JWT_EXPIRES_IN personalizado', () => {
      const configuracion = cargarConfiguracion(conCambios({ JWT_EXPIRES_IN: '30m' }));
      expect(configuracion.jwt.expiresIn).toBe('30m');
    });

    it('nunca incluye el valor de la API_KEY en el mensaje de error', () => {
      const llaveSecreta = 'secreto-corto';

      expect(() => cargarConfiguracion(conCambios({ API_KEY_POSTMAN: llaveSecreta }))).toThrow(
        expect.objectContaining({
          message: expect.not.stringContaining(llaveSecreta),
        }),
      );
    });
  });

  describe('variables SUPERADMIN_* (bootstrap opcional, hallazgo de revisión del PR #7)', () => {
    it('ausentes las tres: superadmin queda en null, sin error (comportamiento actual)', () => {
      const configuracion = cargarConfiguracion(variablesValidas);
      expect(configuracion.superadmin).toBeNull();
    });

    it('presentes y válidas: arma el objeto superadmin con nombre, email y password', () => {
      const configuracion = cargarConfiguracion(
        conCambios({
          SUPERADMIN_NOMBRE: 'Super Administrador',
          SUPERADMIN_EMAIL: 'superadmin@lavadero.com',
          SUPERADMIN_PASSWORD: 'ClaveSuperSegura2026',
        }),
      );

      expect(configuracion.superadmin).toEqual({
        nombre: 'Super Administrador',
        email: 'superadmin@lavadero.com',
        password: 'ClaveSuperSegura2026',
      });
    });

    it('presentes pero sin SUPERADMIN_NOMBRE: usa "Super Administrador" por defecto', () => {
      const configuracion = cargarConfiguracion(
        conCambios({
          SUPERADMIN_EMAIL: 'superadmin@lavadero.com',
          SUPERADMIN_PASSWORD: 'ClaveSuperSegura2026',
        }),
      );

      expect(configuracion.superadmin.nombre).toBe('Super Administrador');
    });

    it.each([
      [
        'solo SUPERADMIN_NOMBRE presente (parcial)',
        { SUPERADMIN_NOMBRE: 'Super Administrador' },
        /SUPERADMIN_EMAIL es obligatoria/,
      ],
      [
        'solo SUPERADMIN_EMAIL presente (parcial)',
        { SUPERADMIN_EMAIL: 'superadmin@lavadero.com' },
        /SUPERADMIN_PASSWORD es obligatoria/,
      ],
      [
        'SUPERADMIN_PASSWORD con el valor de ejemplo de .env.example',
        {
          SUPERADMIN_EMAIL: 'superadmin@lavadero.com',
          SUPERADMIN_PASSWORD: 'REEMPLAZAR_CON_CLAVE_SEGURA',
        },
        /SUPERADMIN_PASSWORD.*valor de ejemplo/,
      ],
      [
        'SUPERADMIN_PASSWORD demasiado corta',
        { SUPERADMIN_EMAIL: 'superadmin@lavadero.com', SUPERADMIN_PASSWORD: 'corta123' },
        /SUPERADMIN_PASSWORD.*al menos 12 caracteres/,
      ],
    ])('rechaza %s', (_descripcion, cambios, mensajeEsperado) => {
      expect(() => cargarConfiguracion(conCambios(cambios))).toThrow(mensajeEsperado);
    });
  });
});
