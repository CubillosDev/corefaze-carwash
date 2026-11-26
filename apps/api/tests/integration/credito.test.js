const request = require('supertest');
const { crearApp } = require('../../src/app');
const { supabase } = require('../../src/db/supabaseCliente');
const { generarToken } = require('../../src/utils/jwt.util');
const {
  generarSello,
  crearGeneradorDeValorUnico,
  baseAleatoriaDeServicio,
} = require('../utils/valorUnico');

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

// Bloque fijo reservado para este archivo (ARCHIVOS_CON_BLOQUE_DE_SERVICIO
// en valorUnico.js), con un desplazamiento aleatorio que no se sale de él
// (baseAleatoriaDeServicio): el bloque disjunto evita chocar con otro
// archivo aunque corran en secuencia sin `db reset` de por medio
// (.github/workflows/api.yml, causa del PR #42); el desplazamiento evita
// que repetir este archivo sin reset choque con lo que dejó la corrida anterior.
const selloNumeroServicio = baseAleatoriaDeServicio(__filename);
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

const numeroVale = () => `VC-${Math.floor(Math.random() * 1e9)}`;

/** Registra el vale de la orden y lo marca verificado: requisito para poder pagarla (R12). */
const crearValeVerificado = async (ordenId) => {
  await conToken('post', '/api/credito/vales').send({ ordenId, numero: numeroVale() });
  await conToken('patch', `/api/credito/vales/${ordenId}`).send({ verificado: true });
};

/**
 * Crea una orden a crédito para el cliente dado y la lleva al estado pedido
 * (por defecto, 'entregada'), con su vale ya verificado (por defecto:
 * `conVale` solo se pone en `false` para probar el 409 de "vale no
 * verificado", ya cubierto también en creditoVales.test.js).
 */
const crearOrdenCredito = async (clienteId, { estado = 'entregada', conVale = true } = {}) => {
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

  if (conVale) {
    await crearValeVerificado(orden.id);
  }

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
  it('incluye un cliente con crédito recién creado, con saldoPendiente/saldoPagable/cantidadOrdenesPagables', async () => {
    await abrirJornada();
    const cliente = await registrarClienteEmpresaConCredito();
    await crearOrdenCredito(cliente.id, { estado: 'entregada' });
    await crearOrdenCredito(cliente.id, { estado: 'registrada' });

    const respuesta = await conToken('get', '/api/credito/clientes');

    expect(respuesta.status).toBe(200);
    const encontrado = respuesta.body.clientes.find((c) => c.id === cliente.id);
    expect(encontrado).toMatchObject({
      creditoHabilitado: true,
      saldoPendiente: 30000,
      saldoPagable: 15000,
      cantidadOrdenesPagables: 1,
    });
  });

  it('incluye un cliente al que ya se le deshabilitó el crédito, mientras tenga deuda sin pagar', async () => {
    await abrirJornada();
    const cliente = await registrarClienteEmpresaConCredito();
    await crearOrdenCredito(cliente.id, { estado: 'registrada' });

    const deshabilitado = await conToken('put', `/api/clientes/${cliente.id}`).send({
      creditoHabilitado: false,
    });
    expect(deshabilitado.body.cliente.creditoHabilitado).toBe(false);

    const respuesta = await conToken('get', '/api/credito/clientes');

    expect(respuesta.status).toBe(200);
    const encontrado = respuesta.body.clientes.find((c) => c.id === cliente.id);
    expect(encontrado).toMatchObject({ creditoHabilitado: false, saldoPendiente: 15000 });
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
  it('incluye solo las órdenes a crédito entregadas y sin pago, con datos legibles de vehículo/servicio/colaborador', async () => {
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

    const colaborador = await obtenerColaboradorCompartido();
    const servicio = await obtenerServicioCompartido();
    expect(respuesta.body.ordenes[0]).toMatchObject({
      fecha: entregada.fecha,
      turno: entregada.turno,
      valor: entregada.valor,
      vehiculo: { placa: expect.any(String) },
      servicio: { nombre: servicio.nombre },
      colaborador: { codigo: colaborador.codigo, nombre: colaborador.nombre },
    });
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
      medio: 'transferencia',
    });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.pago).toMatchObject({
      clienteId: cliente.id,
      valorTotal: primera.valor + segunda.valor,
      detalle: { medio: 'transferencia' },
    });

    const segundoIntento = await conToken('post', '/api/credito/pagos').send({
      clienteId: cliente.id,
      ordenIds: [primera.id],
      medio: 'transferencia',
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
      medio: 'transferencia',
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
      medio: 'transferencia',
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
      medio: 'transferencia',
    });

    expect(respuesta.status).toBe(403);
  });

  it('campo obligatorio faltante: sin clienteId (400)', async () => {
    const respuesta = await conToken('post', '/api/credito/pagos').send({
      ordenIds: [1],
      medio: 'transferencia',
    });
    expect(respuesta.status).toBe(400);
  });

  it('medio faltante: 400', async () => {
    const cliente = await registrarClienteEmpresaConCredito();
    const respuesta = await conToken('post', '/api/credito/pagos').send({
      clienteId: cliente.id,
      ordenIds: [1],
    });
    expect(respuesta.status).toBe(400);
    expect(respuesta.body.errores.some((error) => error.campo === 'medio')).toBe(true);
  });

  it('medio inválido (no es transferencia, cheque ni efectivo): 400', async () => {
    const cliente = await registrarClienteEmpresaConCredito();
    const respuesta = await conToken('post', '/api/credito/pagos').send({
      clienteId: cliente.id,
      ordenIds: [1],
      medio: 'nequi',
    });
    expect(respuesta.status).toBe(400);
  });

  it('ordenIds vacío: 400', async () => {
    const cliente = await registrarClienteEmpresaConCredito();
    const respuesta = await conToken('post', '/api/credito/pagos').send({
      clienteId: cliente.id,
      ordenIds: [],
      medio: 'transferencia',
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
      medio: 'transferencia',
    });
    expect(respuesta.status).toBe(400);
  });

  it('cliente inexistente: 404', async () => {
    const respuesta = await conToken('post', '/api/credito/pagos').send({
      clienteId: 999999999,
      ordenIds: [1],
      medio: 'transferencia',
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
      medio: 'transferencia',
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
      medio: 'transferencia',
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
      medio: 'transferencia',
    });
    expect(respuesta.status).toBe(409);
  });

  // R12 (hallazgo de seguridad, PR fix/CW_API_DUrbano_PagoCreditoExigeVale):
  // antes existía una ruta (sin "medio" en el body) que pagaba sin exigir el
  // vale verificado. Caso completo con el mensaje exacto de la API: ver
  // creditoVales.test.js, "verifica un vale por su número...".
  it('una orden sin el vale verificado: 409', async () => {
    await abrirJornada();
    const cliente = await registrarClienteEmpresaConCredito();
    const sinVale = await crearOrdenCredito(cliente.id, { conVale: false });

    const respuesta = await conToken('post', '/api/credito/pagos').send({
      clienteId: cliente.id,
      ordenIds: [sinVale.id],
      medio: 'transferencia',
    });
    expect(respuesta.status).toBe(409);
    expect(respuesta.body.mensaje).toBe('Solo se pagan órdenes con el vale verificado');
  });

  it('mass assignment: un valorTotal enviado por el cliente se ignora', async () => {
    await abrirJornada();
    const cliente = await registrarClienteEmpresaConCredito();
    const orden = await crearOrdenCredito(cliente.id);

    const respuesta = await conToken('post', '/api/credito/pagos').send({
      clienteId: cliente.id,
      ordenIds: [orden.id],
      medio: 'transferencia',
      valorTotal: 1,
    });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.pago.valorTotal).toBe(orden.valor);
  });

  it('requiere JWT (401 sin Authorization)', async () => {
    const respuesta = await conApiKey('post', '/api/credito/pagos').send({
      clienteId: 1,
      ordenIds: [1],
      medio: 'transferencia',
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
      medio: 'transferencia',
    });
    const pagoB = await conToken('post', '/api/credito/pagos').send({
      clienteId: clienteB.id,
      ordenIds: [ordenB.id],
      medio: 'transferencia',
    });

    const listaCompleta = await conToken('get', '/api/credito/pagos');
    expect(listaCompleta.status).toBe(200);
    const idsCompletos = listaCompleta.body.pagos.map((p) => p.id);
    expect(idsCompletos).toEqual(expect.arrayContaining([pagoA.body.pago.id, pagoB.body.pago.id]));
    expect(listaCompleta.body).toMatchObject({ pagina: 1, porPagina: 20 });
    expect(listaCompleta.body.total).toBeGreaterThanOrEqual(2);

    const filtrada = await conToken('get', `/api/credito/pagos?clienteId=${clienteA.id}`);
    const idsFiltrados = filtrada.body.pagos.map((p) => p.id);
    expect(idsFiltrados).toContain(pagoA.body.pago.id);
    expect(idsFiltrados).not.toContain(pagoB.body.pago.id);
    expect(filtrada.body.total).toBe(1);
  });

  it('pagina/porPagina: trae solo una página y refleja el total y totalPaginas correctos', async () => {
    await abrirJornada();
    const cliente = await registrarClienteEmpresaConCredito();
    const primera = await crearOrdenCredito(cliente.id);
    const segunda = await crearOrdenCredito(cliente.id);
    await conToken('post', '/api/credito/pagos').send({
      clienteId: cliente.id,
      ordenIds: [primera.id],
      medio: 'transferencia',
    });
    await conToken('post', '/api/credito/pagos').send({
      clienteId: cliente.id,
      ordenIds: [segunda.id],
      medio: 'transferencia',
    });

    const paginaUno = await conToken(
      'get',
      `/api/credito/pagos?clienteId=${cliente.id}&pagina=1&porPagina=1`,
    );
    const paginaDos = await conToken(
      'get',
      `/api/credito/pagos?clienteId=${cliente.id}&pagina=2&porPagina=1`,
    );

    expect(paginaUno.body.pagos).toHaveLength(1);
    expect(paginaDos.body.pagos).toHaveLength(1);
    expect(paginaUno.body.pagos[0].id).not.toBe(paginaDos.body.pagos[0].id);
    expect(paginaUno.body).toMatchObject({ total: 2, totalPaginas: 2, porPagina: 1 });
  });

  it('clienteId inválido en el filtro: 400', async () => {
    const respuesta = await conToken('get', '/api/credito/pagos?clienteId=abc');
    expect(respuesta.status).toBe(400);
  });

  it('porPagina por encima del máximo (100): 400', async () => {
    const respuesta = await conToken('get', '/api/credito/pagos?porPagina=101');
    expect(respuesta.status).toBe(400);
  });

  it('pagina menor a 1: 400', async () => {
    const respuesta = await conToken('get', '/api/credito/pagos?pagina=0');
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
      medio: 'transferencia',
    });

    const respuesta = await conToken('get', `/api/credito/pagos/${creado.body.pago.id}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.pago.ordenes.map((o) => o.id)).toEqual([orden.id]);

    const colaborador = await obtenerColaboradorCompartido();
    const servicio = await obtenerServicioCompartido();
    expect(respuesta.body.pago.ordenes[0]).toMatchObject({
      vehiculo: { placa: expect.any(String) },
      servicio: { nombre: servicio.nombre },
      colaborador: { codigo: colaborador.codigo, nombre: colaborador.nombre },
    });
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

// Matriz de roles completa, con aserciones reales por endpoint (no
// inferidas de un endpoint hermano): los 4 de consulta comparten la misma
// instancia de PUEDEN_CONSULTAR (superadmin/administrador/soporte: 200;
// pendiente: 403; sin JWT: 401) — POST /pagos ya queda cubierto en su
// propio describe arriba (PUEDEN_PAGAR: superadmin/administrador 201,
// soporte/pendiente 403, sin JWT 401).
describe('RBAC: matriz completa de roles en los endpoints de consulta', () => {
  let cliente;
  let pagoId;

  beforeAll(async () => {
    await abrirJornada();
    cliente = await registrarClienteEmpresaConCredito();
    const orden = await crearOrdenCredito(cliente.id);
    const pago = await conToken('post', '/api/credito/pagos').send({
      clienteId: cliente.id,
      ordenIds: [orden.id],
      medio: 'transferencia',
    });
    pagoId = pago.body.pago.id;
  });

  const ENDPOINTS_DE_CONSULTA = [
    { nombre: 'GET /clientes', ruta: () => '/api/credito/clientes' },
    {
      nombre: 'GET /clientes/:id/ordenes-pendientes',
      ruta: () => `/api/credito/clientes/${cliente.id}/ordenes-pendientes`,
    },
    { nombre: 'GET /pagos', ruta: () => '/api/credito/pagos' },
    { nombre: 'GET /pagos/:id', ruta: () => `/api/credito/pagos/${pagoId}` },
  ];

  describe.each(ENDPOINTS_DE_CONSULTA)('$nombre', ({ ruta }) => {
    it('superadmin: 200', async () => {
      const respuesta = await conToken('get', ruta(), TOKEN_SUPERADMIN);
      expect(respuesta.status).toBe(200);
    });

    it('administrador: 200', async () => {
      const respuesta = await conToken('get', ruta(), TOKEN_ADMINISTRADOR);
      expect(respuesta.status).toBe(200);
    });

    it('soporte: 200', async () => {
      const respuesta = await conToken('get', ruta(), TOKEN_SOPORTE);
      expect(respuesta.status).toBe(200);
    });

    it('pendiente: 403', async () => {
      const respuesta = await conToken('get', ruta(), TOKEN_PENDIENTE);
      expect(respuesta.status).toBe(403);
    });

    it('sin JWT: 401', async () => {
      const respuesta = await conApiKey('get', ruta());
      expect(respuesta.status).toBe(401);
    });
  });
});
