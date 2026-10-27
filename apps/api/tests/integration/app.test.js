const request = require('supertest');
const { crearApp } = require('../../src/app');

const LLAVE = 'k'.repeat(40);
const ORIGEN = 'http://localhost:5173';

const app = crearApp({
  apiKeys: { postman: LLAVE, admin: 'a'.repeat(40), movil: 'm'.repeat(40), web: 'w'.repeat(40) },
  origenPermitido: ORIGEN,
});
describe('aplicación', () => {
  describe('GET /api/salud', () => {
    it('responde 200 sin necesidad de API Key', async () => {
      const respuesta = await request(app).get('/api/salud');

      expect(respuesta.status).toBe(200);
      expect(respuesta.body).toEqual({ estado: 'ok' });
    });
  });

  describe('API Key', () => {
    it('responde 401 en una ruta de /api sin la llave', async () => {
      const respuesta = await request(app).get('/api/cualquier-cosa');

      expect(respuesta.status).toBe(401);
      expect(respuesta.body).toEqual({ mensaje: 'API Key requerida' });
    });

    it('responde 401 con una llave incorrecta', async () => {
      const respuesta = await request(app)
        .get('/api/cualquier-cosa')
        .set('X-API-Key', 'incorrecta');

      expect(respuesta.status).toBe(401);
      expect(respuesta.body).toEqual({ mensaje: 'API Key inválida' });
    });

    it('deja pasar con la llave correcta (y responde 404 porque la ruta no existe)', async () => {
      const respuesta = await request(app).get('/api/cualquier-cosa').set('X-API-Key', LLAVE);

      expect(respuesta.status).toBe(404);
      expect(respuesta.body).toEqual({ mensaje: 'Ruta no encontrada' });
    });

    it('identifica al cliente autenticado en /api/seguridad/cliente', async () => {
      const respuesta = await request(app).get('/api/seguridad/cliente').set('X-API-Key', LLAVE);

      expect(respuesta.status).toBe(200);
      expect(respuesta.body).toEqual({
        mensaje: 'Cliente autenticado',
        cliente: { id: 1, nombre: 'Postman / Laboratorio' },
      });
    });

    it('SCRUM-140: la API Key del panel web (API_KEY_WEB) también identifica correctamente (200)', async () => {
      const respuesta = await request(app)
        .get('/api/seguridad/cliente')
        .set('X-API-Key', 'w'.repeat(40));

      expect(respuesta.status).toBe(200);
      expect(respuesta.body).toEqual({
        mensaje: 'Cliente autenticado',
        cliente: { id: 4, nombre: 'Panel web' },
      });
    });
  });

  describe('rutas desconocidas', () => {
    it('responde 404 en una ruta fuera de /api', async () => {
      const respuesta = await request(app).get('/otra-ruta');

      expect(respuesta.status).toBe(404);
      expect(respuesta.body).toEqual({ mensaje: 'Ruta no encontrada' });
    });
  });

  describe('lectura del cuerpo', () => {
    it('responde 400 cuando el JSON está malformado', async () => {
      const respuesta = await request(app)
        .post('/api/cualquier-cosa')
        .set('X-API-Key', LLAVE)
        .set('Content-Type', 'application/json')
        .send('{"placa": ');

      expect(respuesta.status).toBe(400);
      expect(respuesta.body).toEqual({ mensaje: 'El cuerpo de la petición no es un JSON válido' });
    });

    it('responde 413 cuando el cuerpo supera los 10 KB', async () => {
      const respuesta = await request(app)
        .post('/api/cualquier-cosa')
        .set('X-API-Key', LLAVE)
        .send({ relleno: 'x'.repeat(11 * 1024) });

      expect(respuesta.status).toBe(413);
    });
  });

  describe('seguridad de cabeceras', () => {
    it('agrega las cabeceras de helmet y oculta que es Express', async () => {
      const respuesta = await request(app).get('/api/salud');

      expect(respuesta.headers['x-content-type-options']).toBe('nosniff');
      expect(respuesta.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('documentación interactiva', () => {
    it('GET /api-docs responde 200 con las cabeceras de Helmet activas', async () => {
      const respuesta = await request(app).get('/api-docs/');

      expect(respuesta.status).toBe(200);
      expect(respuesta.headers['x-content-type-options']).toBe('nosniff');
      expect(respuesta.headers['content-security-policy']).toContain("script-src 'self'");
    });

    it('sirve los scripts de Swagger UI same-origin, sin necesitar ajustar el CSP por defecto', async () => {
      const pagina = await request(app).get('/api-docs/');
      const initJs = await request(app).get('/api-docs/swagger-ui-init.js');

      // swagger-ui-express@5 carga todo con <script src="..."> same-origin
      // (nunca <script> en línea), así que el script-src 'self' por
      // defecto de Helmet ya los permite sin necesitar 'unsafe-inline'.
      expect(pagina.text).not.toMatch(/<script>[\s\S]*?<\/script>/);
      expect(pagina.text).toContain('<script src="./swagger-ui-init.js">');
      expect(initJs.status).toBe(200);
    });
  });

  describe('CORS', () => {
    it('anuncia únicamente el origen configurado', async () => {
      const respuesta = await request(app).get('/api/salud').set('Origin', 'http://sitio-malo.com');

      expect(respuesta.headers['access-control-allow-origin']).toBe(ORIGEN);
    });

    it('responde el preflight del navegador sin exigir la API Key', async () => {
      const respuesta = await request(app)
        .options('/api/colaboradores')
        .set('Origin', ORIGEN)
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'X-API-Key, Content-Type');

      expect(respuesta.status).toBe(204);
      expect(respuesta.headers['access-control-allow-origin']).toBe(ORIGEN);
      expect(respuesta.headers['access-control-allow-headers']).toMatch(/x-api-key/i);
    });
  });
});
