const request = require('supertest');
const { crearApp } = require('../../src/app');
const { supabase } = require('../../src/db/supabaseCliente');
const { generarToken } = require('../../src/utils/jwt.util');
const { generarSello, crearGeneradorDeValorUnico } = require('../utils/valorUnico');

const LLAVE = 'k'.repeat(40);

const app = crearApp({
  apiKeys: { postman: LLAVE, admin: 'a'.repeat(40), movil: 'm'.repeat(40), web: 'w'.repeat(40) },
  origenPermitido: 'http://localhost:5173',
});

// RBAC: todo el recurso exige API Key + JWT con rol autorizado.
// autenticarJWT vuelve a consultar al usuario actual en Supabase (no
// confía en el rol del payload), así que estos ids deben ser los mismos
// (y en el mismo orden) que los 4 usuarios de supabase/seed.sql.
const ROLES_DE_PRUEBA = ['superadmin', 'administrador', 'soporte', 'pendiente'];
const idDeRolDePrueba = (rol) => ROLES_DE_PRUEBA.indexOf(rol) + 1;
const tokenDe = (rol) =>
  generarToken({ id: idDeRolDePrueba(rol), email: `${rol}@lavadero.com`, rol });
const TOKEN_SUPERADMIN = tokenDe('superadmin');
const TOKEN_ADMINISTRADOR = tokenDe('administrador');
const TOKEN_SOPORTE = tokenDe('soporte');
const TOKEN_PENDIENTE = tokenDe('pendiente');

const conApiKey = (metodo, ruta) => request(app)[metodo](ruta).set('X-API-Key', LLAVE);

const conToken = (metodo, ruta, token = TOKEN_ADMINISTRADOR) =>
  conApiKey(metodo, ruta).set('Authorization', `Bearer ${token}`);

// idx_jornadas_una_abierta es GLOBAL: cierra cualquier otra jornada
// abierta (de este archivo o de cualquier otro) antes de abrir la propia.
const cerrarCualquierJornadaAbierta = async () => {
  const { data: abierta } = await supabase
    .from('jornadas')
    .select('id')
    .eq('estado', 'abierta')
    .maybeSingle();

  if (abierta) {
    await supabase
      .from('jornadas')
      .update({ estado: 'cerrada', cerrada_en: new Date().toISOString() })
      .eq('id', abierta.id);
  }
};

beforeEach(async () => {
  await cerrarCualquierJornadaAbierta();
});

const anioBaseJornada = 1000 + Math.floor(Math.random() * 9000);
let contadorDiaJornada = Math.floor(Math.random() * 300);

const abrirJornada = async () => {
  contadorDiaJornada += 1;
  const fecha = new Date(anioBaseJornada, 0, contadorDiaJornada).toISOString().slice(0, 10);

  const { error } = await supabase
    .from('jornadas')
    .insert({ fecha, abierta_por: idDeRolDePrueba('administrador') });

  if (error) {
    throw error;
  }
};

const documentoUnicoDeCliente = crearGeneradorDeValorUnico(
  generarSello(),
  (sello, contador) => `${sello}${String(contador).padStart(3, '0')}`,
);

const registrarClienteEmpresaConCredito = async (overrides = {}) => {
  const respuesta = await conToken('post', '/api/clientes').send({
    nombre: 'Constructora Ejemplo S.A.S.',
    documento: documentoUnicoDeCliente(),
    tipo: 'empresa',
    telefono: '3009876543',
    creditoHabilitado: true,
    ...overrides,
  });
  return respuesta.body.cliente;
};

const LETRAS_PLACA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const letraAleatoriaPlaca = () => LETRAS_PLACA[Math.floor(Math.random() * LETRAS_PLACA.length)];
const prefijoPlaca = `${letraAleatoriaPlaca()}${letraAleatoriaPlaca()}${letraAleatoriaPlaca()}`;
let contadorPlaca = 0;
const siguientePlaca = () => {
  contadorPlaca += 1;
  return `${prefijoPlaca}${String(contadorPlaca).padStart(3, '0')}`;
};

const registrarVehiculo = async (clienteId) => {
  const respuesta = await conToken('post', '/api/vehiculos').send({
    placa: siguientePlaca(),
    tipoVehiculo: 'automovil',
    clienteId,
  });
  return respuesta.body.vehiculo;
};

const documentoUnicoColaborador = crearGeneradorDeValorUnico(
  generarSello(),
  (sello, contador) => `${sello}${String(contador).padStart(3, '0')}`,
);
const codigosOcupadosColaborador = new Set();
let siguienteIntentoCodigoColaborador = Math.floor(Math.random() * 900);

beforeAll(async () => {
  const { data, error } = await supabase.from('colaboradores').select('codigo');
  if (error) {
    throw error;
  }
  data.forEach((fila) => codigosOcupadosColaborador.add(fila.codigo));
});

const codigoUnicoColaborador = () => {
  for (let intento = 0; intento < 900; intento += 1) {
    const candidato = 100 + ((siguienteIntentoCodigoColaborador + intento) % 900);
    if (!codigosOcupadosColaborador.has(candidato)) {
      codigosOcupadosColaborador.add(candidato);
      siguienteIntentoCodigoColaborador += intento + 1;
      return candidato;
    }
  }
  throw new Error('No quedan códigos de colaborador libres (hace falta un db reset)');
};

let colaboradorCompartido = null;
const obtenerColaboradorCompartido = async () => {
  if (!colaboradorCompartido) {
    const respuesta = await conToken('post', '/api/colaboradores').send({
      codigo: codigoUnicoColaborador(),
      nombre: 'Juan Pérez',
      documento: documentoUnicoColaborador(),
      telefono: '3001234567',
      porcentajeComision: 0.15,
      tipoVinculacion: 'fijo',
    });
    colaboradorCompartido = respuesta.body.colaborador;
  }
  return colaboradorCompartido;
};

const selloNumeroServicio = 1000 + Math.floor(Math.random() * 20000);
const numeroUnicoServicio = crearGeneradorDeValorUnico(
  selloNumeroServicio,
  (sello, contador) => sello + contador,
);
let servicioCompartido = null;
const obtenerServicioCompartido = async () => {
  if (!servicioCompartido) {
    const respuesta = await conToken('post', '/api/servicios').send({
      numero: numeroUnicoServicio(),
      nombre: 'Lavado básico',
      descripcion: 'Lavado exterior con shampoo',
      categoria: 'basico',
      tarifas: [{ tipoVehiculo: 'automovil', valor: 15000 }],
    });
    servicioCompartido = respuesta.body.servicio;
  }
  return servicioCompartido;
};

let contadorTurno = 0;
const siguienteTurno = () => {
  contadorTurno += 1;
  return contadorTurno;
};

/** Crea una orden a crédito para el cliente dado y la lleva al estado pedido (por defecto, 'entregada'). */
const crearOrdenCredito = async (clienteId, { estado = 'entregada' } = {}) => {
  const vehiculo = await registrarVehiculo(clienteId);
  const colaborador = await obtenerColaboradorCompartido();
  const servicio = await obtenerServicioCompartido();

  const creada = await conToken('post', '/api/ordenes-lavado').send({
    turno: siguienteTurno(),
    vehiculoId: vehiculo.id,
    servicioId: servicio.id,
    colaboradorId: colaborador.id,
    medioPago: 'credito',
    clienteId,
  });
  const orden = creada.body.orden;

  if (estado === 'registrada') {
    return orden;
  }

  await conToken('patch', `/api/ordenes-lavado/${orden.id}/estado`).send({ estado: 'en_proceso' });
  if (estado === 'en_proceso') {
    return (await conToken('get', `/api/ordenes-lavado/${orden.id}`)).body.orden;
  }

  await conToken('patch', `/api/ordenes-lavado/${orden.id}/estado`).send({ estado: 'terminada' });
  if (estado === 'terminada') {
    return (await conToken('get', `/api/ordenes-lavado/${orden.id}`)).body.orden;
  }

  const entregada = await conToken('patch', `/api/ordenes-lavado/${orden.id}/estado`).send({
    estado: 'entregada',
  });
  return entregada.body.orden;
};

describe('GET /api/credito/clientes', () => {
  it('incluye un cliente con crédito recién creado, con saldoPendiente calculado', async () => {
    await abrirJornada();
    const cliente = await registrarClienteEmpresaConCredito();
    await crearOrdenCredito(cliente.id);

    const respuesta = await conToken('get', '/api/credito/clientes');

    expect(respuesta.status).toBe(200);
    const encontrado = respuesta.body.clientes.find((c) => c.id === cliente.id);
    expect(encontrado).toMatchObject({ saldoPendiente: 15000 });
  });

  it('soporte puede consultar (200)', async () => {
    const respuesta = await conToken('get', '/api/credito/clientes', TOKEN_SOPORTE);
    expect(respuesta.status).toBe(200);
  });

  it('RBAC: un usuario "pendiente" no puede consultar (403)', async () => {
    const respuesta = await conToken('get', '/api/credito/clientes', TOKEN_PENDIENTE);
    expect(respuesta.status).toBe(403);
  });

  it('requiere JWT (401 sin Authorization)', async () => {
    const respuesta = await conApiKey('get', '/api/credito/clientes');
    expect(respuesta.status).toBe(401);
  });

  it('requiere API Key (401 sin X-API-Key)', async () => {
    const respuesta = await request(app)
      .get('/api/credito/clientes')
      .set('Authorization', `Bearer ${TOKEN_ADMINISTRADOR}`);
    expect(respuesta.status).toBe(401);
  });
});

describe('GET /api/credito/clientes/:id/ordenes-pendientes', () => {
  it('incluye solo las órdenes a crédito entregadas y sin pago', async () => {
    await abrirJornada();
    const cliente = await registrarClienteEmpresaConCredito();
    const entregada = await crearOrdenCredito(cliente.id, { estado: 'entregada' });
    await crearOrdenCredito(cliente.id, { estado: 'registrada' });

    const respuesta = await conToken(
      'get',
      `/api/credito/clientes/${cliente.id}/ordenes-pendientes`,
    );

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.ordenes.map((o) => o.id)).toEqual([entregada.id]);
  });

  it('cliente inexistente: 404', async () => {
    const respuesta = await conToken('get', '/api/credito/clientes/999999999/ordenes-pendientes');
    expect(respuesta.status).toBe(404);
  });

  it('id inválido: 400', async () => {
    const respuesta = await conToken('get', '/api/credito/clientes/abc/ordenes-pendientes');
    expect(respuesta.status).toBe(400);
  });

  it('RBAC: un usuario "pendiente" no puede consultar (403)', async () => {
    const cliente = await registrarClienteEmpresaConCredito();
    const respuesta = await conToken(
      'get',
      `/api/credito/clientes/${cliente.id}/ordenes-pendientes`,
      TOKEN_PENDIENTE,
    );
    expect(respuesta.status).toBe(403);
  });
});

describe('POST /api/credito/pagos', () => {
  it('caso válido: registra el pago y lo deja sin poder pagarse otra vez (201)', async () => {
    await abrirJornada();
    const cliente = await registrarClienteEmpresaConCredito();
    const primera = await crearOrdenCredito(cliente.id);
    const segunda = await crearOrdenCredito(cliente.id);

    const respuesta = await conToken('post', '/api/credito/pagos').send({
      clienteId: cliente.id,
      ordenIds: [primera.id, segunda.id],
    });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.pago).toMatchObject({
      clienteId: cliente.id,
      valorTotal: primera.valor + segunda.valor,
    });

    const segundoIntento = await conToken('post', '/api/credito/pagos').send({
      clienteId: cliente.id,
      ordenIds: [primera.id],
    });
    expect(segundoIntento.status).toBe(409);
  });

  it('un superadmin también puede registrar un pago (201)', async () => {
    await abrirJornada();
    const cliente = await registrarClienteEmpresaConCredito();
    const orden = await crearOrdenCredito(cliente.id);

    const respuesta = await conToken('post', '/api/credito/pagos', TOKEN_SUPERADMIN).send({
      clienteId: cliente.id,
      ordenIds: [orden.id],
    });

    expect(respuesta.status).toBe(201);
  });

  it('RBAC: soporte no puede registrar un pago (403)', async () => {
    await abrirJornada();
    const cliente = await registrarClienteEmpresaConCredito();
    const orden = await crearOrdenCredito(cliente.id);

    const respuesta = await conToken('post', '/api/credito/pagos', TOKEN_SOPORTE).send({
      clienteId: cliente.id,
      ordenIds: [orden.id],
    });

    expect(respuesta.status).toBe(403);

    const ordenesPendientes = await conToken(
      'get',
      `/api/credito/clientes/${cliente.id}/ordenes-pendientes`,
    );
    expect(ordenesPendientes.body.ordenes.map((o) => o.id)).toContain(orden.id);
  });

  it('RBAC: un usuario "pendiente" no puede registrar un pago (403)', async () => {
    await abrirJornada();
    const cliente = await registrarClienteEmpresaConCredito();
    const orden = await crearOrdenCredito(cliente.id);

    const respuesta = await conToken('post', '/api/credito/pagos', TOKEN_PENDIENTE).send({
      clienteId: cliente.id,
      ordenIds: [orden.id],
    });

    expect(respuesta.status).toBe(403);
  });

  it('campo obligatorio faltante: sin clienteId (400)', async () => {
    const respuesta = await conToken('post', '/api/credito/pagos').send({ ordenIds: [1] });
    expect(respuesta.status).toBe(400);
  });

  it('ordenIds vacío: 400', async () => {
    const cliente = await registrarClienteEmpresaConCredito();
    const respuesta = await conToken('post', '/api/credito/pagos').send({
      clienteId: cliente.id,
      ordenIds: [],
    });
    expect(respuesta.status).toBe(400);
  });

  it('ordenIds con ids repetidos: 400', async () => {
    await abrirJornada();
    const cliente = await registrarClienteEmpresaConCredito();
    const orden = await crearOrdenCredito(cliente.id);

    const respuesta = await conToken('post', '/api/credito/pagos').send({
      clienteId: cliente.id,
      ordenIds: [orden.id, orden.id],
    });
    expect(respuesta.status).toBe(400);
  });

  it('cliente inexistente: 404', async () => {
    const respuesta = await conToken('post', '/api/credito/pagos').send({
      clienteId: 999999999,
      ordenIds: [1],
    });
    expect(respuesta.status).toBe(404);
  });

  it('alguna orden indicada no existe: 404', async () => {
    await abrirJornada();
    const cliente = await registrarClienteEmpresaConCredito();
    const orden = await crearOrdenCredito(cliente.id);

    const respuesta = await conToken('post', '/api/credito/pagos').send({
      clienteId: cliente.id,
      ordenIds: [orden.id, 999999999],
    });
    expect(respuesta.status).toBe(404);
  });

  it('una orden de otro cliente: 409', async () => {
    await abrirJornada();
    const clienteA = await registrarClienteEmpresaConCredito();
    const clienteB = await registrarClienteEmpresaConCredito();
    const ordenDeB = await crearOrdenCredito(clienteB.id);

    const respuesta = await conToken('post', '/api/credito/pagos').send({
      clienteId: clienteA.id,
      ordenIds: [ordenDeB.id],
    });
    expect(respuesta.status).toBe(409);
  });

  it('una orden que todavía no está entregada: 409', async () => {
    await abrirJornada();
    const cliente = await registrarClienteEmpresaConCredito();
    const ordenEnProceso = await crearOrdenCredito(cliente.id, { estado: 'en_proceso' });

    const respuesta = await conToken('post', '/api/credito/pagos').send({
      clienteId: cliente.id,
      ordenIds: [ordenEnProceso.id],
    });
    expect(respuesta.status).toBe(409);
  });

  it('mass assignment: un valorTotal enviado por el cliente se ignora', async () => {
    await abrirJornada();
    const cliente = await registrarClienteEmpresaConCredito();
    const orden = await crearOrdenCredito(cliente.id);

    const respuesta = await conToken('post', '/api/credito/pagos').send({
      clienteId: cliente.id,
      ordenIds: [orden.id],
      valorTotal: 1,
    });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.pago.valorTotal).toBe(orden.valor);
  });

  it('requiere JWT (401 sin Authorization)', async () => {
    const respuesta = await conApiKey('post', '/api/credito/pagos').send({
      clienteId: 1,
      ordenIds: [1],
    });
    expect(respuesta.status).toBe(401);
  });
});

describe('GET /api/credito/pagos', () => {
  it('la lista incluye el pago recién creado, y el filtro por clienteId funciona', async () => {
    await abrirJornada();
    const clienteA = await registrarClienteEmpresaConCredito();
    const clienteB = await registrarClienteEmpresaConCredito();
    const ordenA = await crearOrdenCredito(clienteA.id);
    const ordenB = await crearOrdenCredito(clienteB.id);

    const pagoA = await conToken('post', '/api/credito/pagos').send({
      clienteId: clienteA.id,
      ordenIds: [ordenA.id],
    });
    const pagoB = await conToken('post', '/api/credito/pagos').send({
      clienteId: clienteB.id,
      ordenIds: [ordenB.id],
    });

    const listaCompleta = await conToken('get', '/api/credito/pagos');
    expect(listaCompleta.status).toBe(200);
    const idsCompletos = listaCompleta.body.pagos.map((p) => p.id);
    expect(idsCompletos).toEqual(expect.arrayContaining([pagoA.body.pago.id, pagoB.body.pago.id]));

    const filtrada = await conToken('get', `/api/credito/pagos?clienteId=${clienteA.id}`);
    const idsFiltrados = filtrada.body.pagos.map((p) => p.id);
    expect(idsFiltrados).toContain(pagoA.body.pago.id);
    expect(idsFiltrados).not.toContain(pagoB.body.pago.id);
  });

  it('clienteId inválido en el filtro: 400', async () => {
    const respuesta = await conToken('get', '/api/credito/pagos?clienteId=abc');
    expect(respuesta.status).toBe(400);
  });

  it('RBAC: un usuario "pendiente" no puede consultar (403)', async () => {
    const respuesta = await conToken('get', '/api/credito/pagos', TOKEN_PENDIENTE);
    expect(respuesta.status).toBe(403);
  });
});

describe('GET /api/credito/pagos/:id', () => {
  it('caso válido: obtiene el pago con sus órdenes (200)', async () => {
    await abrirJornada();
    const cliente = await registrarClienteEmpresaConCredito();
    const orden = await crearOrdenCredito(cliente.id);
    const creado = await conToken('post', '/api/credito/pagos').send({
      clienteId: cliente.id,
      ordenIds: [orden.id],
    });

    const respuesta = await conToken('get', `/api/credito/pagos/${creado.body.pago.id}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.pago.ordenes.map((o) => o.id)).toEqual([orden.id]);
  });

  it('id inexistente: 404', async () => {
    const respuesta = await conToken('get', '/api/credito/pagos/999999999');
    expect(respuesta.status).toBe(404);
  });

  it('id inválido: 400', async () => {
    const respuesta = await conToken('get', '/api/credito/pagos/abc');
    expect(respuesta.status).toBe(400);
  });
});
