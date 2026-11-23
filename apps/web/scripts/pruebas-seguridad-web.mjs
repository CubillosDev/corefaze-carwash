/**
 * Pruebas de seguridad del panel web en un navegador real (Playwright, Chromium).
 *
 * Se corre contra la web compilada (npm run build) y servida con las cabeceras de
 * vercel.json, y contra la API local. No guarda tokens ni contraseñas en el reporte.
 *
 * Variables:
 *   PRUEBAS_WEB_URL            URL de la web (por defecto http://localhost:5173)
 *   PRUEBAS_JWT_SECRET         Para firmar un JWT ya vencido (prueba WEB-05)
 *   PRUEBAS_CLAVE_SUPERADMIN   Contraseña de superadmin@corefaze.demo
 *   PRUEBAS_CLAVE_PENDIENTE    Contraseña de pendiente@corefaze.demo
 *   PRUEBAS_ORDEN_XSS          Orden cuyas observaciones traen el payload XSS (por defecto 2872)
 *   PLAYWRIGHT_MODULO          Ruta al paquete playwright si no está instalado en el repo
 *   PLAYWRIGHT_CANAL           chrome o msedge para usar el navegador instalado
 *
 * Uso: node apps/web/scripts/pruebas-seguridad-web.mjs
 * Salida: docs/seguridad/evidencias/web/pruebas-web.md y capturas .png
 */
import { createHmac } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const SALIDA = join(aqui, '..', '..', '..', 'docs', 'seguridad', 'evidencias', 'web');
const WEB = (process.env.PRUEBAS_WEB_URL ?? 'http://localhost:5173').replace(/\/$/, '');
const ORDEN = process.env.PRUEBAS_ORDEN_XSS ?? '2872';
const CLAVE = 'corefaze.sesion';

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULO ? pathToFileURL(process.env.PLAYWRIGHT_MODULO).href : 'playwright'
);

const requerida = (n) => {
  if (!process.env[n]) throw new Error(`Falta la variable ${n}`);
  return process.env[n];
};

/** JWT HS256 mínimo, para no depender de jsonwebtoken en la web. */
const firmarJwt = (carga, secreto) => {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const cuerpo = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(carga)}`;
  return `${cuerpo}.${createHmac('sha256', secreto).update(cuerpo).digest('base64url')}`;
};

mkdirSync(SALIDA, { recursive: true });
const filas = [];
const fila = (id, prueba, esperado, obtenido, ok, captura = '') =>
  filas.push({ id, prueba, esperado, obtenido, estado: ok ? 'APROBADA' : 'FALLIDA', captura });

const navegador = await chromium.launch(process.env.PLAYWRIGHT_CANAL ? { channel: process.env.PLAYWRIGHT_CANAL } : {});
const nuevo = async () => {
  const contexto = await navegador.newContext({ viewport: { width: 1280, height: 800 } });
  const pagina = await contexto.newPage();
  const dialogos = [];
  pagina.on('dialog', async (d) => {
    dialogos.push(d.message());
    await d.dismiss();
  });
  return { contexto, pagina, dialogos };
};
const ingresar = async (pagina, email, password) => {
  await pagina.goto(`${WEB}/ingreso`);
  await pagina.getByLabel('Correo electrónico').fill(email);
  await pagina.locator('input[name="password"]').fill(password);
  await pagina.getByRole('button', { name: /ingresar|iniciar/i }).click();
};
const captura = async (pagina, nombre) => {
  await pagina.screenshot({ path: join(SALIDA, `${nombre}.png`) });
  return `${nombre}.png`;
};

try {
  // WEB-01: ruta protegida sin sesión.
  let { contexto, pagina } = await nuevo();
  await pagina.goto(`${WEB}/ordenes-lavado`);
  await pagina.waitForURL(/\/ingreso/, { timeout: 10000 }).catch(() => {});
  fila('WEB-01', 'Entrar a una ruta protegida sin sesión', 'redirige a /ingreso', new URL(pagina.url()).pathname,
    new URL(pagina.url()).pathname === '/ingreso', await captura(pagina, 'WEB-01_ruta_protegida_sin_sesion'));

  // WEB-02 y WEB-03: login y dónde queda el token.
  await ingresar(pagina, 'superadmin@corefaze.demo', requerida('PRUEBAS_CLAVE_SUPERADMIN'));
  await pagina.waitForURL((u) => new URL(u).pathname !== '/ingreso', { timeout: 15000 }).catch(() => {});
  fila('WEB-02', 'Login correcto tras intentar /ordenes-lavado', 'entra al panel y vuelve a la ruta pedida', new URL(pagina.url()).pathname,
    new URL(pagina.url()).pathname === '/ordenes-lavado', await captura(pagina, 'WEB-02_login_correcto'));
  const almacen = await pagina.evaluate((k) => ({
    sesion: sessionStorage.getItem(k) !== null,
    local: localStorage.length,
    cookies: document.cookie,
  }), CLAVE);
  const galletas = await contexto.cookies();
  fila('WEB-03', 'El token se guarda solo en sessionStorage', 'sessionStorage sí; localStorage y cookies vacíos',
    `sessionStorage: ${almacen.sesion ? 'sí' : 'no'}; localStorage: ${almacen.local}; cookies: ${galletas.length}`,
    almacen.sesion && almacen.local === 0 && galletas.length === 0 && almacen.cookies === '');

  // WEB-04: XSS almacenado en las observaciones de una orden.
  const dialogos = [];
  pagina.on('dialog', (d) => dialogos.push(d.message()));
  await pagina.goto(`${WEB}/ordenes-lavado/${ORDEN}`);
  await pagina.getByText('[PRUEBA-SEG]', { exact: false }).first().waitFor({ timeout: 15000 }).catch(() => {});
  await pagina.waitForTimeout(1500);
  const xss = await pagina.evaluate(() => ({
    imgInyectada: document.querySelectorAll('img[src="x"]').length,
    textoLiteral: document.body.innerText.includes('<img src=x onerror=alert(1)>'),
  }));
  fila('WEB-04', `XSS almacenado: orden ${ORDEN} con <img src=x onerror=alert(1)> en observaciones`,
    'se muestra como texto, sin alert ni <img>',
    `texto literal: ${xss.textoLiteral ? 'sí' : 'no'}; <img> inyectadas: ${xss.imgInyectada}; diálogos: ${dialogos.length}`,
    xss.textoLiteral && xss.imgInyectada === 0 && dialogos.length === 0, await captura(pagina, 'WEB-04_xss_como_texto'));

  // WEB-05: JWT vencido guardado en la pestaña → la web lo descarta sin usarlo.
  const vigente = await pagina.evaluate((k) => JSON.parse(sessionStorage.getItem(k)), CLAVE);
  const ahora = Math.floor(Date.now() / 1000);
  const real = JSON.parse(Buffer.from(vigente.token.split('.')[1], 'base64url').toString());
  const vencido = firmarJwt({ ...real, iat: ahora - 7200, exp: ahora - 3600 }, requerida('PRUEBAS_JWT_SECRET'));
  await pagina.evaluate(([k, s]) => sessionStorage.setItem(k, JSON.stringify(s)), [CLAVE, { ...vigente, token: vencido }]);
  await pagina.goto(`${WEB}/clientes`);
  await pagina.waitForURL(/\/ingreso/, { timeout: 15000 }).catch(() => {});
  let quedo = await pagina.evaluate((k) => sessionStorage.getItem(k), CLAVE);
  fila('WEB-05', 'JWT vencido en el respaldo de la pestaña', 'lo descarta en el navegador y vuelve a /ingreso',
    `${new URL(pagina.url()).pathname}; respaldo: ${quedo ? 'sigue' : 'borrado'}`,
    new URL(pagina.url()).pathname === '/ingreso' && !quedo, await captura(pagina, 'WEB-05_jwt_vencido'));

  // WEB-06: JWT no vencido pero rechazado por la API (firma inválida, como uno revocado) → 401 en plena sesión.
  const falso = firmarJwt({ ...real, iat: ahora, exp: ahora + 3600 }, 'secreto-que-no-es-el-de-la-api-0123456789abcdef');
  await pagina.evaluate(([k, s]) => sessionStorage.setItem(k, JSON.stringify(s)), [CLAVE, { ...vigente, token: falso }]);
  await pagina.goto(`${WEB}/clientes`);
  await pagina.waitForURL(/\/ingreso/, { timeout: 15000 }).catch(() => {});
  const aviso = await pagina.getByText('Tu sesión expiró').waitFor({ timeout: 5000 }).then(() => true).catch(() => false);
  quedo = await pagina.evaluate((k) => sessionStorage.getItem(k), CLAVE);
  fila('WEB-06', 'JWT rechazado por la API (401) durante la sesión', 'cierre controlado: /ingreso, aviso "Tu sesión expiró" y respaldo borrado',
    `${new URL(pagina.url()).pathname}; aviso: ${aviso ? 'sí' : 'no'}; respaldo: ${quedo ? 'sigue' : 'borrado'}`,
    new URL(pagina.url()).pathname === '/ingreso' && aviso && !quedo, await captura(pagina, 'WEB-06_sesion_expirada_401'));

  // WEB-07: cerrar sesión borra el respaldo.
  await ingresar(pagina, 'superadmin@corefaze.demo', requerida('PRUEBAS_CLAVE_SUPERADMIN'));
  await pagina.waitForURL((u) => new URL(u).pathname === '/', { timeout: 15000 }).catch(() => {});
  await pagina.getByRole('button', { name: /^Perfil de/ }).click();
  await pagina.getByText('Cerrar sesión').click();
  await pagina.waitForURL(/\/ingreso/, { timeout: 10000 }).catch(() => {});
  const tras = await pagina.evaluate((k) => sessionStorage.getItem(k), CLAVE);
  await pagina.goBack();
  await pagina.waitForTimeout(800);
  fila('WEB-07', 'Cerrar sesión y volver atrás', 'borra el respaldo y no deja volver al panel',
    `respaldo: ${tras ? 'sigue' : 'borrado'}; tras volver atrás: ${new URL(pagina.url()).pathname}`,
    !tras && new URL(pagina.url()).pathname === '/ingreso');
  await contexto.close();

  // WEB-08: cuenta pendiente.
  ({ contexto, pagina } = await nuevo());
  await ingresar(pagina, 'pendiente@corefaze.demo', requerida('PRUEBAS_CLAVE_PENDIENTE'));
  const espera = await pagina.getByText('Tu cuenta está pendiente de aprobación').waitFor({ timeout: 15000 })
    .then(() => true).catch(() => false);
  await pagina.goto(`${WEB}/usuarios`);
  await pagina.waitForTimeout(1500);
  const sigue = await pagina.getByText('Tu cuenta está pendiente de aprobación').isVisible().catch(() => false);
  fila('WEB-08', 'Cuenta pendiente entra y luego intenta /usuarios', 'solo ve la pantalla de espera',
    `pantalla de espera: ${espera ? 'sí' : 'no'}; en /usuarios sigue la espera: ${sigue ? 'sí' : 'no'}`,
    espera && sigue, await captura(pagina, 'WEB-08_cuenta_pendiente'));
  await contexto.close();

  // WEB-09: cabeceras de seguridad de la web.
  const r = await fetch(`${WEB}/`);
  const csp = r.headers.get('content-security-policy') ?? '';
  const ok = csp.includes("frame-ancestors 'none'") && csp.includes("object-src 'none'") && !/script-src[^;]*unsafe-inline/.test(csp)
    && r.headers.get('x-frame-options') === 'DENY' && r.headers.get('x-content-type-options') === 'nosniff';
  fila('WEB-09', 'Cabeceras de seguridad de vercel.json', "CSP sin unsafe-inline en scripts, frame-ancestors 'none', X-Frame-Options DENY, nosniff",
    `CSP: ${csp ? 'sí' : 'no'}; X-Frame-Options: ${r.headers.get('x-frame-options')}; nosniff: ${r.headers.get('x-content-type-options')}`, ok);
} finally {
  await navegador.close();
}

const md = [
  '# Pruebas de seguridad del panel web (Playwright)',
  '',
  `Fecha: ${new Date().toISOString().slice(0, 10)}. Web compilada con \`npm run build\`, servida con las cabeceras de \`apps/web/vercel.json\` y conectada a la API local. Navegador: Chrome con Playwright.`,
  '',
  '| ID | Prueba | Esperado | Obtenido | Estado | Captura |',
  '|---|---|---|---|---|---|',
  ...filas.map((f) => `| ${f.id} | ${f.prueba.replace(/</g, '&lt;')} | ${f.esperado.replace(/</g, '&lt;')} | ${f.obtenido.replace(/</g, '&lt;')} | ${f.estado} | ${f.captura ? `[ver](${f.captura})` : '—'} |`),
  '',
  `Resumen: ${filas.filter((f) => f.estado === 'APROBADA').length} de ${filas.length} aprobadas.`,
  '',
].join('\n');
writeFileSync(join(SALIDA, 'pruebas-web.md'), md);
writeFileSync(join(SALIDA, 'pruebas-web.json'), JSON.stringify(filas, null, 2));
console.log(md);
process.exitCode = filas.every((f) => f.estado === 'APROBADA') ? 0 : 1;
