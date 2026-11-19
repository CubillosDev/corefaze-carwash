/**
 * Trazabilidad: mide cuánto tardan las funciones de seguridad de la API y la
 * cadena completa de middlewares de la app real (sin base de datos), y deja
 * el resultado en docs/trazabilidad/ (markdown y csv). En GitHub Actions
 * también lo publica en el resumen de la corrida (GITHUB_STEP_SUMMARY).
 *
 * Uso: npm run trazabilidad --workspace apps/api
 *
 * No se conecta a ninguna base: usa llaves de prueba y solo ejercita rutas
 * que responden antes de consultar datos (salud, rechazos y validaciones).
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Configuración de prueba, igual a tests/setupEnv.js: nunca llaves reales.
Object.assign(process.env, {
  NODE_ENV: 'test',
  PORT: '3000',
  API_KEY_POSTMAN: 'llave-de-pruebas-postman-0123456789',
  API_KEY_ADMIN: 'llave-de-pruebas-admin-0123456789ab',
  API_KEY_MOVIL: 'llave-de-pruebas-movil-0123456789ab',
  API_KEY_WEB: 'llave-de-pruebas-web-0123456789abcd',
  JWT_SECRET: 'secreto-jwt-de-pruebas-0123456789abcdefghijklmnopqrstuvwxyz',
  ALLOWED_ORIGIN: 'http://localhost:5173',
  SUPABASE_URL: 'http://127.0.0.1:54321',
  SUPABASE_SERVICE_ROLE_KEY: 'llave-local-que-nunca-se-usa-0123456789',
});

const { crearApp } = require('../src/app');
const { env } = require('../src/config/env');
const { construirRegistrosApiKeys } = require('../src/data/apiKeys');
const { crearServicioApiKeys } = require('../src/services/apiKeys.service');
const { registroTrazabilidad, percentil } = require('../src/services/trazabilidad.service');
const { generarHash } = require('../src/utils/crypto.util');
const { generarToken, verificarToken } = require('../src/utils/jwt.util');
const { generarPasswordHash, verificarPassword } = require('../src/utils/password.util');
const { aCamelCase } = require('../src/utils/mapearCampos');
const { fechasDelRango } = require('../src/utils/fechaNegocio');

const SALIDA = path.resolve(__dirname, '../../../docs/trazabilidad');
const redondear = (valor, decimales = 3) => Number(valor.toFixed(decimales));
const ahora = () => process.hrtime.bigint();
const msDesde = (inicio) => Number(process.hrtime.bigint() - inicio) / 1e6;

const estadisticas = (servicio, operacion, tiempos) => {
  const total = tiempos.reduce((suma, t) => suma + t, 0);
  const promedio = total / tiempos.length;
  return {
    servicio,
    operacion,
    iteraciones: tiempos.length,
    promedioMs: redondear(promedio),
    medianaMs: redondear(percentil(tiempos, 50)),
    p95Ms: redondear(percentil(tiempos, 95)),
    minimoMs: redondear(Math.min(...tiempos)),
    maximoMs: redondear(Math.max(...tiempos)),
    operacionesPorSegundo: Math.round(1000 / promedio),
  };
};

const medir = async (servicio, operacion, iteraciones, accion) => {
  for (let i = 0; i < Math.min(5, iteraciones); i += 1) await accion(i); // calentamiento
  const tiempos = [];
  for (let i = 0; i < iteraciones; i += 1) {
    const inicio = ahora();
    await accion(i);
    tiempos.push(msDesde(inicio));
  }
  return estadisticas(servicio, operacion, tiempos);
};

const medirFunciones = async () => {
  const apiKeys = crearServicioApiKeys(construirRegistrosApiKeys(env.apiKeys));
  const usuario = { id: 1, email: 'superadmin@lavadero.com', rol: 'superadmin' };
  const token = generarToken(usuario);
  const hash = await generarPasswordHash('Contrasena-de-prueba-123');
  const filas = Array.from({ length: 100 }, (_, i) => ({ id: i, placa_vehiculo: 'ABC123', creado_en: '2026-11-19', medio_pago: 'efectivo' }));

  return [
    await medir('Seguridad', 'SHA-256 de una API Key', 5000, () => generarHash(env.apiKeys.web)),
    await medir('Seguridad', 'Buscar el cliente de una API Key (4 llaves, tiempo constante)', 5000, () =>
      apiKeys.buscarClientePorApiKey(env.apiKeys.movil),
    ),
    await medir('Seguridad', 'Firmar un JWT (HS256)', 2000, () => generarToken(usuario)),
    await medir('Seguridad', 'Verificar un JWT', 2000, () => verificarToken(token)),
    await medir('Seguridad', 'Hash de contraseña con bcrypt (12 rondas)', 10, () => generarPasswordHash('Contrasena-de-prueba-123')),
    await medir('Seguridad', 'Verificar contraseña con bcrypt (12 rondas)', 10, () => verificarPassword('Contrasena-de-prueba-123', hash)),
    await medir('Datos', 'Mapear 100 filas de snake_case a camelCase', 2000, () => aCamelCase(filas)),
    await medir('Datos', 'Fechas de un rango de 31 días (reportes)', 5000, () => fechasDelRango('2026-11-01', '2026-12-01')),
  ];
};

const medirHttp = async () => {
  const app = crearApp(env);
  const servidor = await new Promise((listo) => {
    const s = app.listen(0, '127.0.0.1', () => listo(s));
  });
  const base = `http://127.0.0.1:${servidor.address().port}`;
  const pedir = (metodo, ruta, { llave, cuerpo } = {}) =>
    fetch(base + ruta, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', ...(llave ? { 'X-API-Key': env.apiKeys.web } : {}) },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    }).then((r) => r.arrayBuffer());

  registroTrazabilidad.reiniciar();
  const resultados = [
    await medir('HTTP', 'GET /api/salud (pública)', 300, () => pedir('GET', '/api/salud')),
    await medir('HTTP', 'GET /api/clientes sin API Key → 401', 300, () => pedir('GET', '/api/clientes')),
    await medir('HTTP', 'GET /api/clientes sin JWT → 401', 300, () => pedir('GET', '/api/clientes', { llave: true })),
    await medir('HTTP', 'POST /api/auth/login con datos inválidos → 400', 300, () =>
      pedir('POST', '/api/auth/login', { llave: true, cuerpo: { email: 'no-es-correo', password: '' } }),
    ),
    await medir('HTTP', 'GET /api/no-existe → 404', 300, () => pedir('GET', '/api/no-existe', { llave: true })),
  ];
  servidor.close();
  return { resultados, trazas: registroTrazabilidad.resumen() };
};

const tabla = (filas, columnas) => [
  `| ${columnas.map(([titulo]) => titulo).join(' | ')} |`,
  `| ${columnas.map(() => '---').join(' | ')} |`,
  ...filas.map((fila) => `| ${columnas.map(([, clave]) => fila[clave]).join(' | ')} |`),
];

const COLUMNAS = [
  ['Servicio', 'servicio'],
  ['Operación', 'operacion'],
  ['Iteraciones', 'iteraciones'],
  ['Promedio (ms)', 'promedioMs'],
  ['Mediana (ms)', 'medianaMs'],
  ['p95 (ms)', 'p95Ms'],
  ['Mínimo (ms)', 'minimoMs'],
  ['Máximo (ms)', 'maximoMs'],
  ['Ops/s', 'operacionesPorSegundo'],
];

(async () => {
  const funciones = await medirFunciones();
  const { resultados: http, trazas } = await medirHttp();
  const todas = [...funciones, ...http];
  const fecha = new Date().toISOString();

  const md = [
    '# Trazabilidad: tiempos de ejecución de la API',
    '',
    `Generado con \`npm run trazabilidad --workspace apps/api\` el ${fecha.slice(0, 10)} · Node ${process.version} · ${os.cpus()[0]?.model ?? 'CPU'} · ${os.platform()}.`,
    '',
    'Mide las funciones de seguridad y la cadena completa de middlewares de la app real (helmet, CORS, trazabilidad, API Key, JWT, validación), sin base de datos. Los tiempos con base de datos se ven en vivo en `GET /api/trazabilidad` (solo superadmin).',
    '',
    '## Funciones y peticiones',
    '',
    ...tabla(todas, COLUMNAS),
    '',
    '## Lo que registró el middleware de trazabilidad',
    '',
    'Cada petición HTTP de arriba pasó por el middleware, que la guarda por patrón de ruta (nunca la URL real) y responde con `X-Request-Id` y `X-Response-Time`.',
    '',
    ...tabla(trazas.rutas, [
      ['Ruta', 'ruta'],
      ['Peticiones', 'peticiones'],
      ['Promedio (ms)', 'promedioMs'],
      ['Mediana (ms)', 'medianaMs'],
      ['p95 (ms)', 'p95Ms'],
      ['4xx', 'errores4xx'],
      ['5xx', 'errores5xx'],
    ]),
    '',
    '## Lectura',
    '',
    '- **bcrypt es lo más lento a propósito**: 12 rondas encarecen cada intento de adivinar una contraseña. Es el costo que paga el login, no un problema de rendimiento.',
    '- Verificar la API Key y el JWT cuesta microsegundos: la seguridad de cada petición casi no agrega tiempo.',
    '- Las peticiones rechazadas (401, 400, 404) responden sin tocar la base: un ataque de fuerza bruta no la carga.',
    '',
  ].join('\n');

  const csv = [
    COLUMNAS.map(([, clave]) => clave).join(','),
    ...todas.map((fila) => COLUMNAS.map(([, clave]) => (typeof fila[clave] === 'string' ? `"${fila[clave].replace(/"/g, '""')}"` : fila[clave])).join(',')),
  ].join('\n');

  fs.mkdirSync(SALIDA, { recursive: true });
  fs.writeFileSync(path.join(SALIDA, 'tiempos-servicios.md'), md);
  fs.writeFileSync(path.join(SALIDA, 'tiempos-servicios.csv'), `${csv}\n`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${md}\n`);
  }
  process.stdout.write(`${md}\n`);
})().catch((error) => {
  process.stderr.write(`No se pudo medir: ${error.message}\n`);
  process.exitCode = 1;
});
