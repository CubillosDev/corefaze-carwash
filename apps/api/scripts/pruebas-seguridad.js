/**
 * Pruebas de seguridad de la API contra un entorno en ejecución (nunca producción).
 *
 * Sigue las guías del curso (README 8 "Validación integral", README 11 y la guía
 * de cierre) adaptadas al dominio de Corefaze, y deja una tabla en markdown y
 * JSON. Oculta tokens y llaves: ninguna salida muestra un secreto.
 *
 * Variables (todas obligatorias salvo las que tienen valor por defecto):
 *   PRUEBAS_API_URL              http://localhost:3100/api
 *   PRUEBAS_API_KEY              llave del cliente web
 *   PRUEBAS_JWT_SECRET           secreto JWT del entorno (para fabricar tokens vencidos o alterados)
 *   PRUEBAS_SUPABASE_URL         URL de Supabase del entorno (prueba de RLS con la llave anon)
 *   PRUEBAS_SUPABASE_ANON_KEY    llave anon (pública) de ese Supabase
 *   PRUEBAS_CLAVE_<ROL>          contraseña de <rol>@corefaze.demo para SUPERADMIN, ADMINISTRADOR,
 *                                SOPORTE, PENDIENTE y DESHABILITADO
 *   PRUEBAS_ORIGEN_WEB           http://localhost:5173
 *
 * Uso: node scripts/pruebas-seguridad.js [carpeta-de-salida]
 *
 * Crea datos marcados con [PRUEBA-SEG] y los deja cerrados: la orden de prueba
 * termina cancelada y la cuenta registrada termina desactivada.
 */
const fs = require('node:fs');
const path = require('node:path');
const jwt = require('jsonwebtoken');

const v = (nombre, porDefecto) => {
  const valor = process.env[nombre] ?? porDefecto;
  if (valor === undefined) throw new Error(`Falta la variable ${nombre}`);
  return valor;
};
const API = v('PRUEBAS_API_URL', 'http://localhost:3100/api').replace(/\/$/, '');
const LLAVE = v('PRUEBAS_API_KEY');
const SECRETO_JWT = v('PRUEBAS_JWT_SECRET');
const SUPABASE_URL = v('PRUEBAS_SUPABASE_URL');
const ANON = v('PRUEBAS_SUPABASE_ANON_KEY');
const ORIGEN_WEB = v('PRUEBAS_ORIGEN_WEB', 'http://localhost:5173');
const SALIDA = path.resolve(process.argv[2] ?? path.join(__dirname, '../../../docs/seguridad/evidencias/api'));
const MARCA = '[PRUEBA-SEG]';
const sello = Date.now().toString(36);

const pedir = async (metodo, ruta, { token, llave = true, cuerpo, crudo, cabeceras = {}, base = API } = {}) => {
  const r = await fetch(base + ruta, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(llave ? { 'X-API-Key': LLAVE } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...cabeceras,
    },
    body: crudo ?? (cuerpo === undefined ? undefined : JSON.stringify(cuerpo)),
  });
  const texto = await r.text();
  let json = null;
  try {
    json = JSON.parse(texto);
  } catch {
    // respuesta sin JSON
  }
  return { estado: r.status, json, texto, cabeceras: r.headers };
};

const entrar = async (rol, clave = v(`PRUEBAS_CLAVE_${rol.toUpperCase()}`)) =>
  (await pedir('POST', '/auth/login', { cuerpo: { email: `${rol}@corefaze.demo`, password: clave } })).json?.token;

const filas = [];
/**
 * @param {object} f
 * @param {'APROBADA'|'FALLIDA'|'PARCIAL'|'NO IMPLEMENTADA'} [f.estado] si no se da, se compara esperado/obtenido
 */
const fila = (f) => {
  const estado = f.estado ?? (String(f.obtenido).startsWith(String(f.esperado)) ? 'APROBADA' : 'FALLIDA');
  filas.push({ ...f, estado, detalle: String(f.detalle ?? '').replace(/\|/g, '/').slice(0, 140) });
};
const msg = (r) => r.json?.mensaje ?? r.texto?.slice(0, 80);

(async () => {
  const tokSuper = await entrar('superadmin');
  const tokAdmin = await entrar('administrador');
  const tokSoporte = await entrar('soporte');
  const tokPendiente = await entrar('pendiente');
  if (!tokSuper || !tokAdmin || !tokSoporte || !tokPendiente) throw new Error('No se pudo ingresar con las cuentas de prueba');
  const perfilAdmin = (await pedir('GET', '/auth/perfil', { token: tokAdmin })).json?.usuario;

  // ---------------------------------------------------------------- Autenticación (P01–P07, R11 1–3)
  const correoNuevo = `prueba.seg.${sello}@corefaze.demo`;
  let r = await pedir('POST', '/auth/registro', {
    cuerpo: { nombre: 'Cuenta Prueba Seguridad', email: correoNuevo, password: 'Prueba-Seguridad-2026!x', rol: 'superadmin' },
  });
  const nuevo = r.json?.usuario;
  fila({ id: 'AUT-01', guia: 'B8 P01 / P07', categoria: 'Autenticación', prueba: 'Registro público que intenta pedir rol superadmin', endpoint: 'POST /api/auth/registro', rol: '—',
    esperado: '201 y rol pendiente', obtenido: `${r.estado} rol ${nuevo?.rol}`, estado: r.estado === 201 && nuevo?.rol === 'pendiente' ? 'APROBADA' : 'FALLIDA', detalle: 'El rol enviado se ignora: toda cuenta nace pendiente' });
  r = await pedir('POST', '/auth/registro', { cuerpo: { nombre: 'Cuenta Prueba Seguridad', email: correoNuevo, password: 'Prueba-Seguridad-2026!x' } });
  fila({ id: 'AUT-02', guia: 'B8 P02', categoria: 'Autenticación', prueba: 'Registro con correo duplicado', endpoint: 'POST /api/auth/registro', rol: '—', esperado: 409, obtenido: r.estado, detalle: msg(r) });
  r = await pedir('POST', '/auth/login', { cuerpo: { email: 'superadmin@corefaze.demo', password: v('PRUEBAS_CLAVE_SUPERADMIN') } });
  fila({ id: 'AUT-03', guia: 'B8 P03 / R11-1 / Cierre', categoria: 'Autenticación', prueba: 'Login correcto', endpoint: 'POST /api/auth/login', rol: 'superadmin', esperado: 200, obtenido: r.estado, detalle: r.json?.token ? 'JWT recibido (oculto)' : 'sin token' });
  const sinCookies = !r.cabeceras.get('set-cookie');
  r = await pedir('POST', '/auth/login', { cuerpo: { email: 'superadmin@corefaze.demo', password: 'Clave-Errada-12345' } });
  fila({ id: 'AUT-04', guia: 'B8 P04 / Cierre', categoria: 'Autenticación', prueba: 'Login con contraseña incorrecta', endpoint: 'POST /api/auth/login', rol: '—', esperado: 401, obtenido: r.estado, detalle: msg(r) });
  r = await pedir('POST', '/auth/login', { crudo: '{"email": "superadmin@corefaze.demo",' });
  fila({ id: 'AUT-05', guia: 'R11-2', categoria: 'Autenticación', prueba: 'Login con JSON inválido', endpoint: 'POST /api/auth/login', rol: '—', esperado: 400, obtenido: r.estado, detalle: `${msg(r)}; sin stack: ${!/at .*\(/.test(r.texto)}` });
  r = await pedir('POST', '/auth/login', { cuerpo: { email: 'deshabilitado@corefaze.demo', password: v('PRUEBAS_CLAVE_DESHABILITADO') } });
  fila({ id: 'AUT-06', guia: 'Lab 9', categoria: 'Autenticación', prueba: 'Login de una cuenta desactivada', endpoint: 'POST /api/auth/login', rol: 'soporte inactivo', esperado: 403, obtenido: r.estado, detalle: msg(r) });
  r = await pedir('GET', '/auth/perfil', { token: tokSuper });
  fila({ id: 'AUT-07', guia: 'B8 P05', categoria: 'Autenticación', prueba: 'Perfil con JWT válido', endpoint: 'GET /api/auth/perfil', rol: 'superadmin', esperado: 200, obtenido: r.estado, detalle: `sin passwordHash en la respuesta: ${!/password/i.test(r.texto)}` });
  r = await pedir('GET', '/auth/perfil');
  fila({ id: 'AUT-08', guia: 'B8 P06 / R11-3', categoria: 'Autenticación', prueba: 'Perfil sin JWT', endpoint: 'GET /api/auth/perfil', rol: '—', esperado: 401, obtenido: r.estado, detalle: msg(r) });

  // ---------------------------------------------------------------- JWT (Lab 9, guía de cierre)
  const decodificado = jwt.decode(tokSoporte);
  const [cab, , firma] = tokSoporte.split('.');
  const cargaAlterada = Buffer.from(JSON.stringify({ ...decodificado, rol: 'superadmin' })).toString('base64url');
  r = await pedir('GET', '/usuarios', { token: `${cab}.${cargaAlterada}.${firma}` });
  fila({ id: 'JWT-01', guia: 'Lab 9', categoria: 'JWT', prueba: 'Token con el rol cambiado a superadmin (firma inválida)', endpoint: 'GET /api/usuarios', rol: 'soporte → superadmin', esperado: 401, obtenido: r.estado, detalle: msg(r) });
  const sinFirma = `${Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')}.${cargaAlterada}.`;
  r = await pedir('GET', '/usuarios', { token: sinFirma });
  fila({ id: 'JWT-02', guia: 'Lab 9', categoria: 'JWT', prueba: 'Token con alg "none" (sin firma)', endpoint: 'GET /api/usuarios', rol: '—', esperado: 401, obtenido: r.estado, detalle: msg(r) });
  const vencido = jwt.sign({ ...decodificado, iat: Math.floor(Date.now() / 1000) - 7200, exp: Math.floor(Date.now() / 1000) - 3600 }, SECRETO_JWT, { algorithm: 'HS256' });
  r = await pedir('GET', '/auth/perfil', { token: vencido });
  fila({ id: 'JWT-03', guia: 'Cierre', categoria: 'JWT', prueba: 'Token vencido', endpoint: 'GET /api/auth/perfil', rol: 'soporte', esperado: 401, obtenido: r.estado, detalle: msg(r) });
  const otroSecreto = jwt.sign({ ...decodificado, exp: Math.floor(Date.now() / 1000) + 600 }, 'un-secreto-distinto-al-del-servidor-0123456789');
  r = await pedir('GET', '/auth/perfil', { token: otroSecreto });
  fila({ id: 'JWT-04', guia: 'Lab 9', categoria: 'JWT', prueba: 'Token firmado con otro secreto', endpoint: 'GET /api/auth/perfil', rol: '—', esperado: 401, obtenido: r.estado, detalle: msg(r) });
  if (nuevo?.id) {
    const tokNuevo = (await pedir('POST', '/auth/login', { cuerpo: { email: correoNuevo, password: 'Prueba-Seguridad-2026!x' } })).json?.token;
    const antes = await pedir('GET', '/auth/perfil', { token: tokNuevo });
    await pedir('PATCH', `/usuarios/${nuevo.id}/estado`, { token: tokSuper, cuerpo: { activo: false } });
    r = await pedir('GET', '/auth/perfil', { token: tokNuevo });
    fila({ id: 'JWT-05', guia: 'Cierre (JWT revocado)', categoria: 'JWT', prueba: 'Token vigente de una cuenta que el superadmin desactiva', endpoint: 'GET /api/auth/perfil', rol: 'pendiente', esperado: '200 → 401', obtenido: `${antes.estado} → ${r.estado}`, estado: antes.estado === 200 && r.estado === 401 ? 'APROBADA' : 'FALLIDA', detalle: 'El usuario se recarga en cada petición: desactivarlo invalida su token al instante' });
  }
  r = await pedir('GET', '/auth/perfil', { token: tokSoporte });
  fila({ id: 'JWT-06', guia: 'Cierre / R11-5', categoria: 'JWT', prueba: 'Token después de "cerrar sesión" en el cliente', endpoint: 'GET /api/auth/perfil', rol: 'soporte', esperado: '401 (revocado)', obtenido: r.estado, estado: 'PARCIAL', detalle: 'No hay endpoint de cierre de sesión ni lista de revocación: el token vale hasta su exp (8 h). El web lo borra de su lado' });
  fila({ id: 'JWT-07', guia: 'R11 4–7 / Cierre', categoria: 'JWT', prueba: 'Cambio de contraseña que revoca tokens anteriores (version_sesion)', endpoint: '—', rol: '—', esperado: 'JWT anterior → 401', obtenido: 'sin endpoint', estado: 'NO IMPLEMENTADA', detalle: 'Corefaze no tiene cambio de contraseña ni version_sesion' });
  fila({ id: 'JWT-08', guia: 'R11 8–16 / Cierre', categoria: 'JWT', prueba: 'Recuperación con token o código de un solo uso', endpoint: '—', rol: '—', esperado: 'un solo uso', obtenido: 'sin endpoint', estado: 'NO IMPLEMENTADA', detalle: 'Corefaze no tiene recuperación de cuenta; la contraseña la restablece el superadmin por fuera' });

  // ---------------------------------------------------------------- API Key (Labs 5–6, P35, R11 20–22)
  r = await pedir('GET', '/clientes', { token: tokSuper, llave: false });
  fila({ id: 'KEY-01', guia: 'B8 P35', categoria: 'API Key', prueba: 'Recurso sin X-API-Key', endpoint: 'GET /api/clientes', rol: 'superadmin', esperado: 401, obtenido: r.estado, detalle: msg(r) });
  r = await pedir('GET', '/clientes', { token: tokSuper, llave: false, cabeceras: { 'X-API-Key': 'llave-inventada-0123456789-abcdefghijk' } });
  fila({ id: 'KEY-02', guia: 'Lab 6', categoria: 'API Key', prueba: 'API Key inventada', endpoint: 'GET /api/clientes', rol: 'superadmin', esperado: 401, obtenido: r.estado, detalle: msg(r) });
  r = await pedir('GET', '/seguridad/cliente', { llave: false });
  fila({ id: 'KEY-03', guia: 'R11-20', categoria: 'API Key', prueba: 'Cliente privado sin API Key', endpoint: 'GET /api/seguridad/cliente', rol: '—', esperado: 401, obtenido: r.estado, detalle: msg(r) });
  r = await pedir('GET', '/seguridad/cliente');
  fila({ id: 'KEY-04', guia: 'R11-21', categoria: 'API Key', prueba: 'Cliente privado con API Key válida', endpoint: 'GET /api/seguridad/cliente', rol: '—', esperado: 200, obtenido: r.estado, detalle: `cliente: ${r.json?.cliente?.cliente}; sin hash: ${!/hash/i.test(r.texto)}` });
  r = await pedir('POST', '/auth/login', { llave: false, cuerpo: { email: 'no-es-correo' } });
  fila({ id: 'KEY-05', guia: 'R11-22 / patrón', categoria: 'API Key', prueba: 'Login sin API Key con cuerpo inválido', endpoint: 'POST /api/auth/login', rol: '—', esperado: '400 (no "API Key requerida")', obtenido: r.estado, estado: r.estado === 400 ? 'APROBADA' : 'FALLIDA', detalle: `${msg(r)}. Desviación del patrón: el login exige la llave del panel` });

  // ---------------------------------------------------------------- RBAC y escalada (Lab 8, B8 SEG)
  r = await pedir('POST', '/clientes', { token: tokSoporte, cuerpo: { nombre: 'Prueba Rol', documento: '1234567890', tipo: 'particular', telefono: '3000000000' } });
  fila({ id: 'RBAC-01', guia: 'Lab 8', categoria: 'RBAC', prueba: 'Soporte intenta crear un cliente', endpoint: 'POST /api/clientes', rol: 'soporte', esperado: 403, obtenido: r.estado, detalle: msg(r) });
  r = await pedir('GET', '/clientes', { token: tokPendiente });
  fila({ id: 'RBAC-02', guia: 'Lab 8', categoria: 'RBAC', prueba: 'Cuenta pendiente consulta clientes', endpoint: 'GET /api/clientes', rol: 'pendiente', esperado: 403, obtenido: r.estado, detalle: msg(r) });
  r = await pedir('PATCH', `/auth/usuarios/${perfilAdmin?.id ?? 2}/rol`, { token: tokSoporte, cuerpo: { rol: 'superadmin' } });
  fila({ id: 'RBAC-03', guia: 'Lab 8 / B8 BA09', categoria: 'Escalada', prueba: 'Soporte intenta volver superadmin a otra cuenta', endpoint: 'PATCH /api/auth/usuarios/:id/rol', rol: 'soporte', esperado: 403, obtenido: r.estado, detalle: msg(r) });
  r = await pedir('PATCH', `/auth/usuarios/${perfilAdmin?.id}/rol`, { token: tokAdmin, cuerpo: { rol: 'superadmin' } });
  fila({ id: 'RBAC-04', guia: 'Lab 8', categoria: 'Escalada', prueba: 'Administrador intenta volverse superadmin a sí mismo', endpoint: 'PATCH /api/auth/usuarios/:id/rol', rol: 'administrador', esperado: 403, obtenido: r.estado, detalle: msg(r) });
  r = await pedir('GET', '/usuarios', { token: tokSoporte });
  fila({ id: 'RBAC-05', guia: 'B8 SEG / BOLA', categoria: 'BOLA/IDOR', prueba: 'Soporte lista las cuentas de usuario', endpoint: 'GET /api/usuarios', rol: 'soporte', esperado: 403, obtenido: r.estado, detalle: msg(r) });
  r = await pedir('GET', '/usuarios/1', { token: tokSoporte });
  fila({ id: 'RBAC-06', guia: 'B8 P34 / SEG-02', categoria: 'BOLA/IDOR', prueba: 'Soporte consulta por id la cuenta de otro usuario', endpoint: 'GET /api/usuarios/:id', rol: 'soporte', esperado: 403, obtenido: r.estado, detalle: msg(r) });
  r = await pedir('GET', '/usuarios/1', { token: tokPendiente });
  fila({ id: 'RBAC-07', guia: 'B8 SEG-02', categoria: 'BOLA/IDOR', prueba: 'Cuenta pendiente consulta por id la cuenta de otro usuario', endpoint: 'GET /api/usuarios/:id', rol: 'pendiente', esperado: 403, obtenido: r.estado, detalle: msg(r) });
  const hoy = new Date().toISOString().slice(0, 10);
  const rango = `?desde=${hoy.slice(0, 8)}01&hasta=${hoy}`;
  r = await pedir('GET', `/reportes/resumen${rango}`, { token: tokSoporte });
  fila({ id: 'RBAC-08', guia: 'Cierre (dashboard)', categoria: 'RBAC', prueba: 'Soporte consulta el resumen del negocio', endpoint: 'GET /api/reportes/resumen', rol: 'soporte', esperado: 403, obtenido: r.estado, detalle: msg(r) });
  r = await pedir('GET', `/reportes/resumen${rango}`, { token: tokAdmin });
  fila({ id: 'RBAC-09', guia: 'Cierre (dashboard)', categoria: 'RBAC', prueba: 'Administrador consulta el resumen del negocio', endpoint: 'GET /api/reportes/resumen', rol: 'administrador', esperado: 200, obtenido: r.estado, detalle: 'Indicadores disponibles' });
  r = await pedir('GET', '/nomina/quincenas/resumen', { token: tokSoporte });
  fila({ id: 'RBAC-10', guia: 'Lab 8', categoria: 'RBAC', prueba: 'Soporte consulta la nómina (salarios)', endpoint: 'GET /api/nomina/quincenas/resumen', rol: 'soporte', esperado: 403, obtenido: r.estado, detalle: msg(r) });
  const jornadas = (await pedir('GET', '/jornadas', { token: tokAdmin })).json?.jornadas ?? [];
  const cerrada = jornadas.find((j) => j.estado === 'cerrada');
  if (cerrada) {
    r = await pedir('PATCH', `/jornadas/${cerrada.id}/estado`, { token: tokAdmin, cuerpo: { estado: 'abierta' } });
    fila({ id: 'RBAC-11', guia: 'Lab 10', categoria: 'RBAC', prueba: 'Administrador intenta reabrir una jornada cerrada', endpoint: 'PATCH /api/jornadas/:id/estado', rol: 'administrador', esperado: 403, obtenido: r.estado, detalle: msg(r) });
  }

  // ---------------------------------------------------------------- Validación e inyección (Lab 3, OWASP A03)
  const total = (await pedir('GET', '/usuarios?porPagina=100', { token: tokSuper })).json?.total;
  r = await pedir('GET', `/usuarios?busqueda=${encodeURIComponent("' OR 1=1 --")}`, { token: tokSuper });
  fila({ id: 'VAL-01', guia: 'Lab 3 / A03', categoria: 'Inyección', prueba: "Búsqueda con inyección SQL clásica (' OR 1=1 --)", endpoint: 'GET /api/usuarios?busqueda=', rol: 'superadmin', esperado: '200 sin datos extra', obtenido: `${r.estado}, ${r.json?.total} de ${total}`, estado: r.estado === 200 && r.json?.total === 0 ? 'APROBADA' : 'FALLIDA', detalle: 'El texto se busca literal; supabase-js parametriza' });
  r = await pedir('GET', `/usuarios?busqueda=${encodeURIComponent('zz%,email.ilike.%')}`, { token: tokSuper });
  fila({ id: 'VAL-02', guia: 'A03', categoria: 'Inyección', prueba: 'Inyección de filtros de PostgREST en la búsqueda (,email.ilike.%)', endpoint: 'GET /api/usuarios?busqueda=', rol: 'superadmin', esperado: '200 sin ampliar resultados', obtenido: `${r.estado}, ${r.json?.total} de ${total}`, estado: r.estado === 200 && r.json?.total === 0 ? 'APROBADA' : 'FALLIDA', detalle: 'patronIlikeSeguro encierra el patrón entre comillas' });
  r = await pedir('POST', '/vehiculos', { token: tokSuper, cuerpo: { placa: 'AB-12', tipoVehiculo: 'automovil', clienteId: 1 } });
  fila({ id: 'VAL-03', guia: 'Lab 3', categoria: 'Validación', prueba: 'Placa con formato inválido', endpoint: 'POST /api/vehiculos', rol: 'superadmin', esperado: 400, obtenido: r.estado, detalle: JSON.stringify(r.json?.errores?.[0] ?? msg(r)) });
  r = await pedir('POST', '/auth/login', { crudo: JSON.stringify({ email: 'a@b.co', password: 'x'.repeat(12000) }) });
  fila({ id: 'VAL-04', guia: 'Lab 3', categoria: 'Validación', prueba: 'Cuerpo de más de 10 KB', endpoint: 'POST /api/auth/login', rol: '—', esperado: 413, obtenido: r.estado, detalle: msg(r) });
  r = await pedir('GET', '/clientes/abc', { token: tokSuper });
  fila({ id: 'VAL-05', guia: 'Lab 3', categoria: 'Validación', prueba: 'Identificador que no es un número', endpoint: 'GET /api/clientes/:id', rol: 'superadmin', esperado: 400, obtenido: r.estado, detalle: msg(r) });
  r = await pedir('GET', '/clientes/999999999', { token: tokSuper });
  fila({ id: 'VAL-06', guia: 'B8', categoria: 'Validación', prueba: 'Recurso inexistente', endpoint: 'GET /api/clientes/:id', rol: 'superadmin', esperado: 404, obtenido: r.estado, detalle: msg(r) });

  // ---------------------------------------------------------------- Reglas de negocio y asignación masiva (B8 P26–P33, A04)
  let jornada = jornadas.find((j) => j.estado === 'abierta');
  if (!jornada) {
    jornada = (await pedir('POST', '/jornadas', { token: tokSuper })).json?.jornada;
  }
  const [{ vehiculos }, { ordenes }, { servicios }, { colaboradores }] = await Promise.all(
    ['/vehiculos', '/ordenes-lavado', '/servicios', '/colaboradores'].map(async (ruta) => (await pedir('GET', ruta, { token: tokSuper })).json),
  );
  const abiertas = new Set(ordenes.filter((o) => !['entregada', 'cancelada'].includes(o.estado)).map((o) => o.vehiculoId));
  const carros = vehiculos.filter((x) => x.tipoVehiculo === 'automovil' && !abiertas.has(x.id));
  const servicio = servicios.find((s) => s.activo && s.numero === 1);
  const tarifa = servicio.tarifas.find((t) => t.tipoVehiculo === 'automovil').valor;
  const activo = colaboradores.find((c) => c.estado === 'activo');
  const inactivo = colaboradores.find((c) => c.estado === 'inactivo');
  const delDia = ordenes.filter((o) => o.jornadaId === jornada?.id);
  const turno = delDia.reduce((m, o) => Math.max(m, o.turno), 0) + 1;
  const base = (vehiculo, extra = {}) => ({ turno, vehiculoId: vehiculo.id, servicioId: servicio.id, colaboradorId: activo.id, medioPago: 'efectivo', observaciones: `${MARCA} <img src=x onerror=alert(1)>`, ...extra });

  r = await pedir('POST', '/ordenes-lavado', { token: tokSuper, cuerpo: base(carros[0], { valor: 1, estado: 'entregada' }) });
  const orden = r.json?.orden;
  fila({ id: 'NEG-01', guia: 'B8 P26 / A04', categoria: 'Asignación masiva', prueba: 'Crear orden enviando valor 1 y estado entregada', endpoint: 'POST /api/ordenes-lavado', rol: 'superadmin', esperado: '201, valor de tarifa y estado registrada', obtenido: `${r.estado}, valor ${orden?.valor}, ${orden?.estado}`, estado: r.estado === 201 && orden?.valor === tarifa && orden?.estado === 'registrada' ? 'APROBADA' : 'FALLIDA', detalle: `El servidor calcula el valor (tarifa ${tarifa}) e ignora el estado (R4)` });
  r = await pedir('POST', '/ordenes-lavado', { token: tokSuper, cuerpo: base({ id: 999999999 }, { turno: turno + 1 }) });
  fila({ id: 'NEG-02', guia: 'B8 P27', categoria: 'Reglas', prueba: 'Orden con un vehículo inexistente', endpoint: 'POST /api/ordenes-lavado', rol: 'superadmin', esperado: 404, obtenido: r.estado, detalle: msg(r) });
  if (inactivo) {
    r = await pedir('POST', '/ordenes-lavado', { token: tokSuper, cuerpo: base(carros[1], { turno: turno + 1, colaboradorId: inactivo.id }) });
    fila({ id: 'NEG-03', guia: 'B8 P28 (R2)', categoria: 'Reglas', prueba: 'Orden para un colaborador inactivo', endpoint: 'POST /api/ordenes-lavado', rol: 'superadmin', esperado: 409, obtenido: r.estado, detalle: msg(r) });
  }
  r = await pedir('POST', '/ordenes-lavado', { token: tokSuper, cuerpo: base(carros[0], { turno: turno + 1 }) });
  fila({ id: 'NEG-04', guia: 'B8 P29 (R6)', categoria: 'Reglas', prueba: 'Segunda orden abierta para la misma placa', endpoint: 'POST /api/ordenes-lavado', rol: 'superadmin', esperado: 409, obtenido: r.estado, detalle: msg(r) });
  r = await pedir('POST', '/ordenes-lavado', { token: tokSuper, cuerpo: base(carros[1]) });
  fila({ id: 'NEG-05', guia: 'B8 P30 / Cierre (índice único)', categoria: 'Reglas', prueba: 'Turno repetido en la misma fecha', endpoint: 'POST /api/ordenes-lavado', rol: 'superadmin', esperado: 409, obtenido: r.estado, detalle: msg(r) });
  const motor = servicios.find((s) => s.activo && s.numero >= 5 && s.numero <= 8 && s.tarifas.some((t) => t.tipoVehiculo === 'automovil'));
  if (motor) {
    r = await pedir('POST', '/ordenes-lavado', { token: tokSuper, cuerpo: base(carros[2], { turno: turno + 1, servicioId: motor.id }) });
    fila({ id: 'NEG-06', guia: 'R7', categoria: 'Reglas', prueba: 'Lavado de motor sin autorización del cliente', endpoint: 'POST /api/ordenes-lavado', rol: 'superadmin', esperado: 'rechazo (400 o 409)', obtenido: r.estado, estado: [400, 409].includes(r.estado) ? 'APROBADA' : 'FALLIDA', detalle: msg(r) });
  }
  // R8 exige un cliente particular sin crédito: las empresas del demo sí lo tienen.
  let sinCredito = null;
  for (const carro of carros.slice(1, 15)) {
    const cliente = (await pedir('GET', `/clientes/${carro.clienteId}`, { token: tokSuper })).json?.cliente;
    if (cliente && !cliente.creditoHabilitado) {
      sinCredito = carro;
      break;
    }
  }
  r = await pedir('POST', '/ordenes-lavado', { token: tokSuper, cuerpo: base(sinCredito, { turno: turno + 1, medioPago: 'credito', clienteId: sinCredito.clienteId }) });
  fila({ id: 'NEG-07', guia: 'R8', categoria: 'Reglas', prueba: 'Crédito para un cliente sin crédito habilitado', endpoint: 'POST /api/ordenes-lavado', rol: 'superadmin', esperado: 'rechazo (400 o 409)', obtenido: r.estado, estado: [400, 409].includes(r.estado) ? 'APROBADA' : 'FALLIDA', detalle: msg(r) });
  if (orden) {
    r = await pedir('PATCH', `/ordenes-lavado/${orden.id}/estado`, { token: tokSuper, cuerpo: { estado: 'terminada' } });
    fila({ id: 'NEG-08', guia: 'B8 P33 (R9)', categoria: 'Reglas', prueba: 'Saltar de registrada a terminada', endpoint: 'PATCH /api/ordenes-lavado/:id/estado', rol: 'superadmin', esperado: 409, obtenido: r.estado, detalle: msg(r) });
    r = await pedir('PATCH', `/ordenes-lavado/${orden.id}/estado`, { token: tokSoporte, cuerpo: { estado: 'cancelada', motivo: 'Prueba' } });
    fila({ id: 'NEG-09', guia: 'Lab 10', categoria: 'RBAC', prueba: 'Soporte intenta anular una orden', endpoint: 'PATCH /api/ordenes-lavado/:id/estado', rol: 'soporte', esperado: 403, obtenido: r.estado, detalle: msg(r) });
    r = await pedir('PATCH', `/ordenes-lavado/${orden.id}/estado`, { token: tokSuper, cuerpo: { estado: 'cancelada' } });
    fila({ id: 'NEG-10', guia: 'Reglas', categoria: 'Validación', prueba: 'Anular sin motivo', endpoint: 'PATCH /api/ordenes-lavado/:id/estado', rol: 'superadmin', esperado: 400, obtenido: r.estado, detalle: msg(r) });
    await pedir('PATCH', `/ordenes-lavado/${orden.id}/estado`, { token: tokSuper, cuerpo: { estado: 'cancelada', motivo: `${MARCA} cierre de la prueba` } });
    r = await pedir('PATCH', `/ordenes-lavado/${orden.id}`, { token: tokSuper, cuerpo: { observaciones: 'cambio posterior' } });
    fila({ id: 'NEG-11', guia: 'R10', categoria: 'Reglas', prueba: 'Modificar una orden ya cancelada', endpoint: 'PATCH /api/ordenes-lavado/:id', rol: 'superadmin', esperado: 409, obtenido: r.estado, detalle: msg(r) });
    r = await pedir('GET', `/ordenes-lavado/${orden.id}`, { token: tokSuper });
    fila({ id: 'XSS-01', guia: 'A03 (XSS almacenado)', categoria: 'XSS', prueba: 'La API guarda y devuelve el texto con HTML como dato, sin interpretarlo', endpoint: 'GET /api/ordenes-lavado/:id', rol: 'superadmin', esperado: '200, JSON', obtenido: `${r.estado}, ${r.cabeceras.get('content-type')?.split(';')[0]}`, estado: r.estado === 200 && /json/.test(r.cabeceras.get('content-type') ?? '') ? 'APROBADA' : 'FALLIDA', detalle: 'El escape lo hace React al mostrarlo (ver pruebas del web)' });
  }

  // Limpieza: ninguna orden de prueba queda abierta.
  const restantes = (await pedir('GET', '/ordenes-lavado', { token: tokSuper })).json?.ordenes ?? [];
  for (const o of restantes.filter((x) => x.observaciones?.startsWith(MARCA) && !['entregada', 'cancelada'].includes(x.estado))) {
    await pedir('PATCH', `/ordenes-lavado/${o.id}/estado`, { token: tokSuper, cuerpo: { estado: 'cancelada', motivo: `${MARCA} cierre de la prueba` } });
  }

  // ---------------------------------------------------------------- CORS, cabeceras, CSRF y límite de intentos (Lab 3, R11 Paso 10)
  r = await pedir('OPTIONS', '/auth/login', { llave: false, cabeceras: { Origin: ORIGEN_WEB, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type,x-api-key' } });
  fila({ id: 'CAB-01', guia: 'R11 Paso 10', categoria: 'CORS', prueba: 'Preflight desde el panel web', endpoint: 'OPTIONS /api/auth/login', rol: '—', esperado: 204, obtenido: r.estado, detalle: `Allow-Origin: ${r.cabeceras.get('access-control-allow-origin')}` });
  r = await pedir('OPTIONS', '/auth/login', { llave: false, cabeceras: { Origin: 'https://sitio-malicioso.example', 'Access-Control-Request-Method': 'POST' } });
  const reflejo = r.cabeceras.get('access-control-allow-origin');
  fila({ id: 'CAB-02', guia: 'Lab 3', categoria: 'CORS', prueba: 'Preflight desde un origen ajeno', endpoint: 'OPTIONS /api/auth/login', rol: '—', esperado: 'no refleja el origen', obtenido: reflejo ?? 'sin cabecera', estado: reflejo !== 'https://sitio-malicioso.example' ? 'APROBADA' : 'FALLIDA', detalle: 'Solo se permite ALLOWED_ORIGIN' });
  r = await pedir('GET', '/salud', { llave: false });
  const h = (n) => (r.cabeceras.get(n) ? 'sí' : 'no');
  fila({ id: 'CAB-03', guia: 'Lab 3 (helmet)', categoria: 'Cabeceras', prueba: 'Cabeceras de seguridad y sin X-Powered-By', endpoint: 'GET /api/salud', rol: '—', esperado: 'presentes', obtenido: `CSP ${h('content-security-policy')}, HSTS ${h('strict-transport-security')}, nosniff ${h('x-content-type-options')}, X-Powered-By ${h('x-powered-by')}`, estado: h('content-security-policy') === 'sí' && h('x-powered-by') === 'no' ? 'APROBADA' : 'FALLIDA', detalle: 'helmet()' });
  fila({ id: 'CAB-04', guia: 'A01 (CSRF)', categoria: 'CSRF', prueba: 'El login no deja cookies de sesión', endpoint: 'POST /api/auth/login', rol: '—', esperado: 'sin Set-Cookie', obtenido: sinCookies ? 'sin Set-Cookie' : 'con Set-Cookie', estado: sinCookies ? 'APROBADA' : 'FALLIDA', detalle: 'El token viaja en Authorization: Bearer; un sitio ajeno no puede enviarlo solo (CSRF no aplica)' });
  r = await pedir('GET', '/../api-docs/', { llave: false });
  fila({ id: 'CAB-05', guia: 'R11-25', categoria: 'Swagger', prueba: 'Documentación publicada en /api-docs', endpoint: 'GET /api-docs', rol: '—', esperado: 200, obtenido: r.estado, detalle: 'Esquemas BearerAuth y ApiKeyAuth: ver evidencias/api/swagger.md' });
  let ultimo = null;
  for (let i = 0; i < 25; i += 1) {
    ultimo = await pedir('POST', '/auth/login', { cuerpo: { email: 'no-existe@corefaze.demo', password: `Intento-${i}-abcdef` } });
  }
  fila({ id: 'LIM-01', guia: 'Patrón del curso', categoria: 'Fuerza bruta', prueba: '25 intentos de login fallidos seguidos', endpoint: 'POST /api/auth/login', rol: '—', esperado: 429, obtenido: ultimo.estado, detalle: ultimo.estado === 429 ? 'Límite activo' : 'No hay límite de intentos (express-rate-limit pendiente)' });

  // ---------------------------------------------------------------- RLS frente al acceso directo (R11 Verificación 07)
  r = await pedir('GET', '/rest/v1/clientes?select=id,nombre&limit=1', { llave: false, base: SUPABASE_URL, cabeceras: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
  fila({ id: 'RLS-01', guia: 'R11 Verif. 07', categoria: 'RLS', prueba: 'La llave anon lee clientes directo por PostgREST', endpoint: 'GET /rest/v1/clientes', rol: 'anon', esperado: 'denegado o vacío', obtenido: `${r.estado} ${r.json?.code ?? ''}`, estado: r.estado === 401 || r.estado === 403 || (Array.isArray(r.json) && r.json.length === 0) ? 'APROBADA' : 'FALLIDA', detalle: msg(r) });
  r = await pedir('GET', '/rest/v1/usuarios?select=password_hash&limit=1', { llave: false, base: SUPABASE_URL, cabeceras: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
  fila({ id: 'RLS-02', guia: 'R11 Verif. 07', categoria: 'RLS', prueba: 'La llave anon intenta leer hashes de contraseña', endpoint: 'GET /rest/v1/usuarios', rol: 'anon', esperado: 'denegado', obtenido: `${r.estado} ${r.json?.code ?? ''}`, estado: r.estado === 401 || r.estado === 403 || (Array.isArray(r.json) && r.json.length === 0) ? 'APROBADA' : 'FALLIDA', detalle: msg(r) });

  // ---------------------------------------------------------------- salida
  const resumen = filas.reduce((acc, f) => ({ ...acc, [f.estado]: (acc[f.estado] ?? 0) + 1 }), {});
  const md = [
    '# Pruebas de seguridad de la API',
    '',
    `Ejecutadas el ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC contra \`${API}\` con \`node scripts/pruebas-seguridad.js\`. Tokens y llaves ocultos.`,
    '',
    `**Resultado:** ${Object.entries(resumen).map(([k, n]) => `${n} ${k.toLowerCase()}`).join(' · ')} (de ${filas.length}).`,
    '',
    '| ID | Guía | Categoría | Prueba | Endpoint | Rol | Esperado | Obtenido | Estado | Observación |',
    '|---|---|---|---|---|---|---|---|---|---|',
    ...filas.map((f) => `| ${f.id} | ${f.guia} | ${f.categoria} | ${f.prueba} | \`${f.endpoint}\` | ${f.rol} | ${f.esperado} | ${f.obtenido} | **${f.estado}** | ${f.detalle} |`),
    '',
  ].join('\n');
  fs.mkdirSync(SALIDA, { recursive: true });
  fs.writeFileSync(path.join(SALIDA, 'pruebas-api.md'), md);
  fs.writeFileSync(path.join(SALIDA, 'pruebas-api.json'), JSON.stringify({ resumen, ordenDePrueba: orden?.id ?? null, filas }, null, 2));
  process.stdout.write(`${md}\n`);
})().catch((error) => {
  process.stderr.write(`Las pruebas no pudieron terminar: ${error.message}\n`);
  process.exitCode = 1;
});
