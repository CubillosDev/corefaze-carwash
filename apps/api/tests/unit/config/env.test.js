const { cargarConfiguracion } = require('../../../src/config/env');

const variablesValidas = Object.freeze({
  NODE_ENV: 'development',
  PORT: '3000',
  API_KEY: 'a'.repeat(32),
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
        apiKey: 'a'.repeat(32),
        origenPermitido: 'http://localhost:5173',
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
      ['API_KEY ausente', { API_KEY: undefined }, /API_KEY es obligatoria/],
      ['API_KEY demasiado corta', { API_KEY: 'corta' }, /al menos 32 caracteres/],
      [
        'API_KEY con el valor de ejemplo',
        { API_KEY: 'cambiar-por-una-llave-larga-y-aleatoria' },
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

    it('nunca incluye el valor de la API_KEY en el mensaje de error', () => {
      const llaveSecreta = 'secreto-corto';

      expect(() => cargarConfiguracion(conCambios({ API_KEY: llaveSecreta }))).toThrow(
        expect.objectContaining({
          message: expect.not.stringContaining(llaveSecreta),
        }),
      );
    });
  });
});
