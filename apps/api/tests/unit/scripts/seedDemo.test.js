const { spawnSync } = require('node:child_process');
const path = require('node:path');

const SCRIPT = path.join(__dirname, '../../../scripts/seed-demo.js');

// Corre el script sin las variables DEMO_*: si se negara a correr, debe
// hacerlo antes de leer credenciales o tocar la red.
const correr = (variables) =>
  spawnSync(process.execPath, [SCRIPT], {
    env: { PATH: process.env.PATH, ...variables },
    encoding: 'utf8',
    timeout: 15000,
  });

describe('seed-demo', () => {
  it.each([
    ['ENTORNO=produccion', { ENTORNO: 'produccion' }],
    ['NODE_ENV=production', { NODE_ENV: 'production' }],
    ['producción con NODE_ENV de desarrollo', { ENTORNO: 'produccion', NODE_ENV: 'development' }],
  ])('se niega a correr con %s', (_caso, variables) => {
    const resultado = correr(variables);

    expect(resultado.status).toBe(1);
    expect(resultado.stderr).toMatch(/seed-demo no corre en producción/);
  });

  it('en pruebas sí intenta cargar (y falla solo porque faltan las credenciales)', () => {
    const resultado = correr({ ENTORNO: 'pruebas' });

    expect(resultado.status).toBe(1);
    expect(resultado.stderr).not.toMatch(/producción/);
    expect(resultado.stderr).toMatch(/Falta la variable DEMO_API_URL/);
  });
});
