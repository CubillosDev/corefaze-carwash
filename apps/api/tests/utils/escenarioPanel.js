/**
 * Escenario común de las pruebas de los módulos del panel (ADR 0007): la
 * app con una llave de prueba, tokens por rol (los 4 usuarios de
 * supabase/seed.sql) y fábricas de datos únicos que pasan por la API, igual
 * que las demás pruebas de integración.
 */
const request = require('supertest');
const { crearApp } = require('../../src/app');
const { supabase } = require('../../src/db/supabaseCliente');
const { generarToken } = require('../../src/utils/jwt.util');
const {
  generarSello,
  crearGeneradorDeValorUnico,
  baseAleatoriaDeServicio,
} = require('./valorUnico');

const LLAVE = 'k'.repeat(40);

const app = crearApp({
  apiKeys: { postman: LLAVE, admin: 'a'.repeat(40), movil: 'm'.repeat(40), web: 'w'.repeat(40) },
  origenPermitido: 'http://localhost:5173',
});

const ROLES_DE_PRUEBA = ['superadmin', 'administrador', 'soporte', 'pendiente'];
const idDeRolDePrueba = (rol) => ROLES_DE_PRUEBA.indexOf(rol) + 1;
const tokenDe = (rol) =>
  generarToken({ id: idDeRolDePrueba(rol), email: `${rol}@lavadero.com`, rol });

const conApiKey = (metodo, ruta) => request(app)[metodo](ruta).set('X-API-Key', LLAVE);
const conRol = (rol, metodo, ruta) =>
  conApiKey(metodo, ruta).set('Authorization', `Bearer ${tokenDe(rol)}`);
const conToken = (metodo, ruta) => conRol('administrador', metodo, ruta);

/** idx_jornadas_una_abierta e idx_cajas_una_abierta son globales: se cierra lo que haya abierto. */
const cerrarJornadaYCajaAbiertas = async () => {
  await supabase
    .from('cajas')
    .update({
      estado: 'cerrada',
      cerrada_en: new Date().toISOString(),
      cerrada_por: idDeRolDePrueba('administrador'),
      efectivo_esperado: 0,
      efectivo_contado: 0,
    })
    .eq('estado', 'abierta');
  await supabase
    .from('jornadas')
    .update({ estado: 'cerrada', cerrada_en: new Date().toISOString() })
    .eq('estado', 'abierta');
};

// Fechas lejanas y únicas por archivo: las órdenes quedan amarradas a su
// jornada para siempre (impedir_eliminacion), así que nunca se reutiliza "hoy".
const anioBase = 3000 + Math.floor(Math.random() * 5000);
let diaJornada = Math.floor(Math.random() * 300);

/** Abre una jornada con fecha única y devuelve esa fecha. */
const abrirJornada = async () => {
  diaJornada += 1;
  const fecha = new Date(Date.UTC(anioBase, 0, diaJornada)).toISOString().slice(0, 10);
  const { error } = await supabase
    .from('jornadas')
    .insert({ fecha, abierta_por: idDeRolDePrueba('administrador') });
  if (error) {
    throw error;
  }
  return fecha;
};

const documentoUnico = crearGeneradorDeValorUnico(
  generarSello(),
  (sello, contador) => `${sello}${String(contador).padStart(3, '0')}`,
);

const registrarCliente = async ({ empresa = false, credito = false } = {}) => {
  const respuesta = await conToken('post', '/api/clientes').send({
    nombre: empresa ? 'Empresa de Prueba S.A.S.' : 'Cliente de Prueba',
    documento: documentoUnico(),
    tipo: empresa ? 'empresa' : 'particular',
    telefono: '3009876543',
    creditoHabilitado: credito,
  });
  if (respuesta.status !== 201) {
    throw new Error(`No se pudo crear el cliente: ${JSON.stringify(respuesta.body)}`);
  }
  return respuesta.body.cliente;
};

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const letra = () => LETRAS[Math.floor(Math.random() * LETRAS.length)];
const prefijoPlaca = `${letra()}${letra()}${letra()}`;
let contadorPlaca = Math.floor(Math.random() * 500);
const siguientePlaca = () => {
  contadorPlaca += 1;
  return `${prefijoPlaca}${String(contadorPlaca % 1000).padStart(3, '0')}`;
};

const registrarVehiculo = async (clienteId) => {
  const respuesta = await conToken('post', '/api/vehiculos').send({
    placa: siguientePlaca(),
    tipoVehiculo: 'automovil',
    clienteId,
  });
  if (respuesta.status !== 201) {
    throw new Error(`No se pudo crear el vehículo: ${JSON.stringify(respuesta.body)}`);
  }
  return respuesta.body.vehiculo;
};

let colaborador = null;
const obtenerColaborador = async () => {
  if (!colaborador) {
    const { data } = await supabase.from('colaboradores').select('codigo');
    const ocupados = new Set(data.map((fila) => fila.codigo));
    const codigo = [...Array(900).keys()].map((n) => 100 + n).find((c) => !ocupados.has(c));
    const respuesta = await conToken('post', '/api/colaboradores').send({
      codigo,
      nombre: 'Colaborador de Prueba',
      documento: documentoUnico(),
      telefono: '3001234567',
      porcentajeComision: 0.4,
      tipoVinculacion: 'fijo',
    });
    colaborador = respuesta.body.colaborador;
  }
  return colaborador;
};

// Este módulo lo cargan varios archivos de prueba (uno por cada require,
// porque Jest no comparte módulos entre archivos), y cada uno necesita su
// propio número de servicio para no chocar con los demás. Como
// obtenerServicio() no sabe quién lo llamó, el archivo que vaya a usar
// crearOrden() debe llamar fijarArchivoDelServicio(__filename) una vez,
// antes de su primer crearOrden().
let baseServicio = null;
const fijarArchivoDelServicio = (archivo) => {
  baseServicio = baseAleatoriaDeServicio(archivo);
};

let servicio = null;
const obtenerServicio = async () => {
  if (!servicio) {
    if (baseServicio === null) {
      throw new Error(
        'Antes de crearOrden(), llama fijarArchivoDelServicio(__filename) (ver escenarioPanel.js).',
      );
    }
    const respuesta = await conToken('post', '/api/servicios').send({
      numero: baseServicio,
      nombre: 'Lavado de prueba',
      descripcion: 'Lavado exterior',
      categoria: 'basico',
      tarifas: [{ tipoVehiculo: 'automovil', valor: 20000 }],
    });
    servicio = respuesta.body.servicio;
  }
  return servicio;
};

let turno = 0;

/**
 * Registra una orden y la lleva por las transiciones permitidas hasta el
 * estado pedido. Por defecto en efectivo y del vehículo de un particular.
 */
const crearOrden = async ({ estado = 'terminada', clienteId, medioPago = 'efectivo' } = {}) => {
  const duenoId = clienteId ?? (await registrarCliente()).id;
  const vehiculo = await registrarVehiculo(duenoId);
  turno += 1;
  const creada = await conToken('post', '/api/ordenes-lavado').send({
    turno,
    vehiculoId: vehiculo.id,
    servicioId: (await obtenerServicio()).id,
    colaboradorId: (await obtenerColaborador()).id,
    medioPago,
    ...(medioPago === 'credito' ? { clienteId: duenoId } : {}),
  });
  if (creada.status !== 201) {
    throw new Error(`No se pudo crear la orden: ${JSON.stringify(creada.body)}`);
  }
  const orden = creada.body.orden;
  for (const paso of ['en_proceso', 'terminada', 'entregada']) {
    if (orden.estado === estado) {
      break;
    }
    const respuesta = await conToken('patch', `/api/ordenes-lavado/${orden.id}/estado`).send({
      estado: paso,
    });
    orden.estado = respuesta.body.orden.estado;
  }
  return { ...orden, vehiculo };
};

module.exports = {
  app,
  supabase,
  idDeRolDePrueba,
  conApiKey,
  conRol,
  conToken,
  cerrarJornadaYCajaAbiertas,
  abrirJornada,
  registrarCliente,
  registrarVehiculo,
  obtenerColaborador,
  fijarArchivoDelServicio,
  crearOrden,
};
