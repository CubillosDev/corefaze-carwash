const { conApiKey, conRol } = require('../utils/escenarioPanel');

describe('trazabilidad de la API', () => {
  it('toda respuesta de /api lleva X-Request-Id y X-Response-Time', async () => {
    const respuesta = await conApiKey('get', '/api/salud');
    expect(respuesta.status).toBe(200);
    expect(respuesta.headers['x-request-id']).toBeTruthy();
    expect(respuesta.headers['x-response-time']).toMatch(/ms$/);
  });

  it('el CORS deja leer las cabeceras de trazabilidad al panel', async () => {
    const respuesta = await conApiKey('get', '/api/salud').set('Origin', 'http://localhost:5173');
    expect(respuesta.headers['access-control-expose-headers']).toMatch(/X-Request-Id/);
  });

  describe('GET /api/trazabilidad', () => {
    it('sin token responde 401', async () => {
      const respuesta = await conApiKey('get', '/api/trazabilidad');
      expect(respuesta.status).toBe(401);
    });

    it.each([['administrador'], ['soporte']])('responde 403 al rol %s', async (rol) => {
      const respuesta = await conRol(rol, 'get', '/api/trazabilidad');
      expect(respuesta.status).toBe(403);
    });

    it('el superadmin ve los tiempos por patrón de ruta, sin URLs reales', async () => {
      await conRol('superadmin', 'get', '/api/clientes/999999');
      const respuesta = await conRol('superadmin', 'get', '/api/trazabilidad');

      expect(respuesta.status).toBe(200);
      const { rutas, totalPeticiones } = respuesta.body.trazabilidad;
      expect(totalPeticiones).toBeGreaterThan(0);
      const detalle = rutas.find((fila) => fila.ruta === 'GET /api/clientes/:id');
      expect(detalle).toMatchObject({ peticiones: expect.any(Number), promedioMs: expect.any(Number), p95Ms: expect.any(Number) });
      expect(JSON.stringify(rutas)).not.toContain('999999');
    });
  });

  describe('DELETE /api/trazabilidad', () => {
    it('solo el superadmin reinicia las métricas', async () => {
      expect((await conRol('administrador', 'delete', '/api/trazabilidad')).status).toBe(403);

      const respuesta = await conRol('superadmin', 'delete', '/api/trazabilidad');
      expect(respuesta.status).toBe(200);
      const despues = await conRol('superadmin', 'get', '/api/trazabilidad');
      // Solo queda registrada la propia petición DELETE anterior.
      expect(despues.body.trazabilidad.totalPeticiones).toBeLessThanOrEqual(1);
    });
  });
});
