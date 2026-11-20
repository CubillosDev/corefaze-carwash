const express = require('express');
const request = require('supertest');
const { crearMiddlewareTrazabilidad } = require('../../../src/middlewares/trazabilidad.middleware');
const { crearRegistroTrazabilidad } = require('../../../src/services/trazabilidad.service');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const crearAppDePrueba = (registro) => {
  const app = express();
  app.use('/api', crearMiddlewareTrazabilidad(registro));
  const router = express.Router();
  router.get('/', (req, res) => res.json({ id: req.idPeticion }));
  router.get('/:id', (req, res) => res.json({ id: req.params.id }));
  router.post('/', (req, res) => res.status(400).json({ mensaje: 'inválido' }));
  router.get('/falla/total', () => {
    throw new Error('falla de prueba');
  });
  app.use('/api/items', router);
  app.use((req, res) => res.status(404).json({ mensaje: 'Ruta no encontrada' }));
  // eslint-disable-next-line no-unused-vars
  app.use((error, req, res, next) => res.status(500).json({ mensaje: 'Error interno' }));
  return app;
};

describe('middleware de trazabilidad', () => {
  let registro;
  let app;

  beforeEach(() => {
    registro = crearRegistroTrazabilidad();
    app = crearAppDePrueba(registro);
  });

  it('genera un X-Request-Id (UUID) y lo deja disponible en req.idPeticion', async () => {
    const respuesta = await request(app).get('/api/items');
    expect(respuesta.headers['x-request-id']).toMatch(UUID);
    expect(respuesta.body.id).toBe(respuesta.headers['x-request-id']);
  });

  it('respeta un X-Request-Id válido que envía el cliente', async () => {
    const respuesta = await request(app).get('/api/items').set('X-Request-Id', 'panel-1234abcd');
    expect(respuesta.headers['x-request-id']).toBe('panel-1234abcd');
  });

  it.each([['<script>alert(1)</script>'], ['corto'], ['a'.repeat(65)], ['con espacios 1234']])(
    'ignora un X-Request-Id peligroso o inválido (%s) y genera uno nuevo',
    async (valor) => {
      const respuesta = await request(app).get('/api/items').set('X-Request-Id', valor);
      expect(respuesta.headers['x-request-id']).toMatch(UUID);
    },
  );

  it('responde con X-Response-Time en milisegundos', async () => {
    const respuesta = await request(app).get('/api/items');
    expect(respuesta.headers['x-response-time']).toMatch(/^\d+\.\dms$/);
  });

  it('agrupa por patrón de ruta, sin guardar los identificadores reales', async () => {
    await request(app).get('/api/items/111');
    await request(app).get('/api/items/222');
    const { rutas } = registro.resumen();
    const detalle = rutas.find((fila) => fila.ruta === 'GET /api/items/:id');
    expect(detalle.peticiones).toBe(2);
    expect(JSON.stringify(rutas)).not.toMatch(/111|222/);
  });

  it('cuenta los errores 4xx y 5xx de cada ruta', async () => {
    await request(app).post('/api/items').send({});
    await request(app).get('/api/items/falla/total');
    const { rutas } = registro.resumen();
    expect(rutas.find((fila) => fila.ruta === 'POST /api/items').errores4xx).toBe(1);
    expect(rutas.find((fila) => fila.ruta === 'GET /api/items/falla/total').errores5xx).toBe(1);
  });

  it('las peticiones que ninguna ruta atendió quedan agrupadas por recurso', async () => {
    await request(app).get('/api/desconocido/abc/123');
    const { rutas } = registro.resumen();
    expect(rutas.map((fila) => fila.ruta)).toContain('GET /api/desconocido (sin ruta)');
  });
});
