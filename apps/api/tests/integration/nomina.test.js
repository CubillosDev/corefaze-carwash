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

// El endpoint POST /api/jornadas SIEMPRE usa la fecha de "hoy" del
// servidor (nunca la del cliente, ver jornadas.service.js): para fijar
// una fecha arbitraria (las quincenas de prueba de abajo) hace falta
// insertar directo, igual que credito.test.js.
const abrirJornadaEn = async (fecha) => {
  await cerrarCualquierJornadaAbierta();
  const { error } = await supabase
    .from('jornadas')
    .insert({ fecha, abierta_por: idDeRolDePrueba('administrador') });
  if (error) {
    throw error;
  }
};

const documentoUnicoCliente = crearGeneradorDeValorUnico(
  generarSello(),
  (sello, contador) => `${sello}P${String(contador).padStart(3, '0')}`,
);

const registrarClienteParticular = async () => {
  const respuesta = await conToken('post', '/api/clientes').send({
    nombre: 'Cliente de prueba',
    documento: documentoUnicoCliente(),
    tipo: 'particular',
    telefono: '3007654321',
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

let clienteCompartido = null;
const registrarVehiculo = async () => {
  if (!clienteCompartido) {
    clienteCompartido = await registrarClienteParticular();
  }
  const respuesta = await conToken('post', '/api/vehiculos').send({
    placa: siguientePlaca(),
    tipoVehiculo: 'automovil',
    clienteId: clienteCompartido.id,
  });
  return respuesta.body.vehiculo;
};

const documentoUnicoColaborador = crearGeneradorDeValorUnico(
  generarSello(),
  (sello, contador) => `${sello}C${String(contador).padStart(3, '0')}`,
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

/** Colaborador activo con porcentajeComision=0.15 (con la tarifa de 15000 de abajo, comisión=2250 exacto). */
const registrarColaboradorActivo = async () => {
  const respuesta = await conToken('post', '/api/colaboradores').send({
    codigo: codigoUnicoColaborador(),
    nombre: 'Juan Pérez',
    documento: documentoUnicoColaborador(),
    telefono: '3001234567',
    porcentajeComision: 0.15,
    tipoVinculacion: 'fijo',
  });
  return respuesta.body.colaborador;
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

/**
 * Orden en efectivo (no necesita cliente a crédito), fecha = la jornada
 * abierta, llevada al estado pedido (por defecto, 'entregada' —
 * liquidar_quincena exige que no haya órdenes abiertas).
 */
const crearOrdenEfectivo = async (colaboradorId, { estado = 'entregada' } = {}) => {
  const vehiculo = await registrarVehiculo();
  const servicio = await obtenerServicioCompartido();
  const creada = await conToken('post', '/api/ordenes-lavado').send({
    turno: siguienteTurno(),
    vehiculoId: vehiculo.id,
    servicioId: servicio.id,
    colaboradorId,
    medioPago: 'efectivo',
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

// Años muy anteriores al real: cualquier quincena en este rango ya
// "terminó" para liquidar_quincena (p_hoy real siempre >= p_fin), sin
// fingir p_hoy. Base aleatoria para no chocar con otros archivos que
// corran en paralelo contra el mismo Supabase (mismo criterio que
// anioBaseJornada en credito/ordenesLavado).
const anioBaseQuincena = 1800 + Math.floor(Math.random() * 90);
let contadorQuincena = 0;

const formatoFecha = (fecha) => fecha.toISOString().slice(0, 10);

/** Próxima quincena real, siempre posterior a la anterior en este archivo (nunca se repite ni retrocede). */
const siguienteQuincena = () => {
  const indice = contadorQuincena;
  contadorQuincena += 1;

  const mesAbsoluto = Math.floor(indice / 2);
  const esSegundaQuincena = indice % 2 === 1;
  const anio = anioBaseQuincena + Math.floor(mesAbsoluto / 12);
  const mes = mesAbsoluto % 12;

  if (!esSegundaQuincena) {
    return {
      inicio: formatoFecha(new Date(Date.UTC(anio, mes, 1))),
      fin: formatoFecha(new Date(Date.UTC(anio, mes, 15))),
    };
  }

  return {
    inicio: formatoFecha(new Date(Date.UTC(anio, mes, 16))),
    fin: formatoFecha(new Date(Date.UTC(anio, mes + 1, 0))),
  };
};

describe('GET /api/nomina/quincenas/resumen', () => {
  it('incluye la comisión, los descuentos por tipo, el neto y el saldo pendiente de un colaborador', async () => {
    const { inicio, fin } = siguienteQuincena();
    await abrirJornadaEn(inicio);
    const colaborador = await registrarColaboradorActivo();
    await crearOrdenEfectivo(colaborador.id);
    await conToken('post', '/api/nomina/descuentos').send({
      colaboradorId: colaborador.id,
      tipo: 'jabon',
      valor: 1000,
      fecha: inicio,
    });

    const respuesta = await conToken(
      'get',
      `/api/nomina/quincenas/resumen?inicio=${inicio}&fin=${fin}`,
    );

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toMatchObject({ inicio, fin, liquidada: false, liquidacionId: null });
    const fila = respuesta.body.colaboradores.find((c) => c.colaboradorId === colaborador.id);
    expect(fila).toMatchObject({
      codigo: colaborador.codigo,
      nombre: colaborador.nombre,
      estado: 'activo',
      comision: 2250,
      descuentos: { prestamo: 0, jabon: 1000, multa: 0, cxc: 0 },
      neto: 1250,
      saldoPendiente: 0,
    });
  });

  it('incluye a un colaborador inactivo que tuvo órdenes en el periodo (misma unión que liquidar_quincena, sin filtrar por estado)', async () => {
    const { inicio, fin } = siguienteQuincena();
    await abrirJornadaEn(inicio);
    const colaborador = await registrarColaboradorActivo();
    await crearOrdenEfectivo(colaborador.id);
    await conToken('patch', `/api/colaboradores/${colaborador.id}/estado`).send({
      estado: 'inactivo',
    });

    const respuesta = await conToken(
      'get',
      `/api/nomina/quincenas/resumen?inicio=${inicio}&fin=${fin}`,
    );

    expect(respuesta.status).toBe(200);
    const fila = respuesta.body.colaboradores.find((c) => c.colaboradorId === colaborador.id);
    expect(fila).toMatchObject({ estado: 'inactivo', comision: 2250 });
  });

  it('un colaborador activo sin ninguna orden ni descuento en el periodo no aparece', async () => {
    const { inicio, fin } = siguienteQuincena();
    const colaborador = await registrarColaboradorActivo();

    const respuesta = await conToken(
      'get',
      `/api/nomina/quincenas/resumen?inicio=${inicio}&fin=${fin}`,
    );

    expect(respuesta.status).toBe(200);
    expect(
      respuesta.body.colaboradores.find((c) => c.colaboradorId === colaborador.id),
    ).toBeUndefined();
  });

  it('periodo que no es una quincena real: 400', async () => {
    const respuesta = await conToken(
      'get',
      '/api/nomina/quincenas/resumen?inicio=2026-01-02&fin=2026-01-15',
    );
    expect(respuesta.status).toBe(400);
  });

  it('sin inicio ni fin: 400', async () => {
    const respuesta = await conToken('get', '/api/nomina/quincenas/resumen');
    expect(respuesta.status).toBe(400);
  });
});

describe('GET /api/nomina/colaboradores/:colaboradorId/descuentos', () => {
  it('incluye los descuentos del colaborador en el rango, con sus datos', async () => {
    const { inicio, fin } = siguienteQuincena();
    const colaborador = await registrarColaboradorActivo();
    const descuento = await conToken('post', '/api/nomina/descuentos').send({
      colaboradorId: colaborador.id,
      tipo: 'multa',
      valor: 20000,
      fecha: inicio,
    });

    const respuesta = await conToken(
      'get',
      `/api/nomina/colaboradores/${colaborador.id}/descuentos?inicio=${inicio}&fin=${fin}`,
    );

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.colaborador).toMatchObject({
      id: colaborador.id,
      codigo: colaborador.codigo,
    });
    expect(respuesta.body.descuentos.map((d) => d.id)).toContain(descuento.body.descuento.id);
  });

  it('colaborador inexistente: 404', async () => {
    const respuesta = await conToken(
      'get',
      '/api/nomina/colaboradores/999999999/descuentos?inicio=2026-01-01&fin=2026-01-15',
    );
    expect(respuesta.status).toBe(404);
  });

  it('colaboradorId inválido: 400', async () => {
    const respuesta = await conToken(
      'get',
      '/api/nomina/colaboradores/abc/descuentos?inicio=2026-01-01&fin=2026-01-15',
    );
    expect(respuesta.status).toBe(400);
  });
});

describe('POST /api/nomina/descuentos', () => {
  it('caso válido: registra el descuento (201)', async () => {
    const { inicio } = siguienteQuincena();
    const colaborador = await registrarColaboradorActivo();

    const respuesta = await conToken('post', '/api/nomina/descuentos').send({
      colaboradorId: colaborador.id,
      tipo: 'jabon',
      valor: 50000,
      fecha: inicio,
      observacion: 'Jabón de la quincena',
    });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.descuento).toMatchObject({
      colaboradorId: colaborador.id,
      tipo: 'jabon',
      valor: 50000,
    });
  });

  it('colaborador inexistente: 404', async () => {
    const { inicio } = siguienteQuincena();
    const respuesta = await conToken('post', '/api/nomina/descuentos').send({
      colaboradorId: 999999999,
      tipo: 'jabon',
      valor: 1000,
      fecha: inicio,
    });
    expect(respuesta.status).toBe(404);
  });

  it('colaborador inactivo: 409', async () => {
    const { inicio } = siguienteQuincena();
    const colaborador = await registrarColaboradorActivo();
    await conToken('patch', `/api/colaboradores/${colaborador.id}/estado`).send({
      estado: 'inactivo',
    });

    const respuesta = await conToken('post', '/api/nomina/descuentos').send({
      colaboradorId: colaborador.id,
      tipo: 'jabon',
      valor: 1000,
      fecha: inicio,
    });
    expect(respuesta.status).toBe(409);
  });

  it('préstamo que supera el disponible (sin comisión ni descuentos previos): 409', async () => {
    const { inicio } = siguienteQuincena();
    const colaborador = await registrarColaboradorActivo();

    const respuesta = await conToken('post', '/api/nomina/descuentos').send({
      colaboradorId: colaborador.id,
      tipo: 'prestamo',
      valor: 1,
      fecha: inicio,
    });
    expect(respuesta.status).toBe(409);
  });

  it('tipo inválido: 400', async () => {
    const { inicio } = siguienteQuincena();
    const colaborador = await registrarColaboradorActivo();
    const respuesta = await conToken('post', '/api/nomina/descuentos').send({
      colaboradorId: colaborador.id,
      tipo: 'cafe',
      valor: 1000,
      fecha: inicio,
    });
    expect(respuesta.status).toBe(400);
  });

  it('valor menor o igual a cero: 400', async () => {
    const { inicio } = siguienteQuincena();
    const colaborador = await registrarColaboradorActivo();
    const respuesta = await conToken('post', '/api/nomina/descuentos').send({
      colaboradorId: colaborador.id,
      tipo: 'jabon',
      valor: 0,
      fecha: inicio,
    });
    expect(respuesta.status).toBe(400);
  });

  it('mass assignment: un liquidacionId enviado por el cliente se ignora', async () => {
    const { inicio } = siguienteQuincena();
    const colaborador = await registrarColaboradorActivo();

    const respuesta = await conToken('post', '/api/nomina/descuentos').send({
      colaboradorId: colaborador.id,
      tipo: 'jabon',
      valor: 1000,
      fecha: inicio,
      liquidacionId: 999999999,
    });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.descuento.liquidacionId).toBeNull();
  });

  it('RBAC: soporte no puede registrar un descuento (403)', async () => {
    const { inicio } = siguienteQuincena();
    const colaborador = await registrarColaboradorActivo();
    const respuesta = await conToken('post', '/api/nomina/descuentos', TOKEN_SOPORTE).send({
      colaboradorId: colaborador.id,
      tipo: 'jabon',
      valor: 1000,
      fecha: inicio,
    });
    expect(respuesta.status).toBe(403);
  });

  it('RBAC: un usuario "pendiente" no puede registrar un descuento (403)', async () => {
    const { inicio } = siguienteQuincena();
    const colaborador = await registrarColaboradorActivo();
    const respuesta = await conToken('post', '/api/nomina/descuentos', TOKEN_PENDIENTE).send({
      colaboradorId: colaborador.id,
      tipo: 'jabon',
      valor: 1000,
      fecha: inicio,
    });
    expect(respuesta.status).toBe(403);
  });

  it('un superadmin también puede registrar un descuento (201)', async () => {
    const { inicio } = siguienteQuincena();
    const colaborador = await registrarColaboradorActivo();
    const respuesta = await conToken('post', '/api/nomina/descuentos', TOKEN_SUPERADMIN).send({
      colaboradorId: colaborador.id,
      tipo: 'jabon',
      valor: 1000,
      fecha: inicio,
    });
    expect(respuesta.status).toBe(201);
  });

  it('requiere JWT (401 sin Authorization)', async () => {
    const respuesta = await conApiKey('post', '/api/nomina/descuentos').send({
      colaboradorId: 1,
      tipo: 'jabon',
      valor: 1000,
      fecha: '2026-01-01',
    });
    expect(respuesta.status).toBe(401);
  });
});

describe('POST /api/nomina/quincenas/liquidar', () => {
  it('caso válido: liquida la quincena con el detalle por colaborador (201)', async () => {
    const { inicio, fin } = siguienteQuincena();
    await abrirJornadaEn(inicio);
    const colaborador = await registrarColaboradorActivo();
    const orden = await crearOrdenEfectivo(colaborador.id);

    const respuesta = await conToken('post', '/api/nomina/quincenas/liquidar').send({
      inicio,
      fin,
    });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.liquidacion).toMatchObject({
      periodoInicio: inicio,
      periodoFin: fin,
      totalComision: 2250,
    });
    const detalle = respuesta.body.liquidacion.colaboradores.find(
      (c) => c.colaboradorId === colaborador.id,
    );
    expect(detalle).toMatchObject({
      servicios: 1,
      producido: orden.valor,
      comision: 2250,
      colaborador: { codigo: colaborador.codigo, nombre: colaborador.nombre },
    });
  });

  it('periodo que no es una quincena real: 400', async () => {
    const respuesta = await conToken('post', '/api/nomina/quincenas/liquidar').send({
      inicio: '2026-01-01',
      fin: '2026-01-20',
    });
    expect(respuesta.status).toBe(400);
  });

  it('quincena que aún no ha terminado: 409', async () => {
    const respuesta = await conToken('post', '/api/nomina/quincenas/liquidar').send({
      inicio: '2099-01-01',
      fin: '2099-01-15',
    });
    expect(respuesta.status).toBe(409);
  });

  it('mass assignment: un "hoy" futuro enviado por el cliente se ignora (sigue dando 409)', async () => {
    const respuesta = await conToken('post', '/api/nomina/quincenas/liquidar').send({
      inicio: '2099-01-01',
      fin: '2099-01-15',
      hoy: '2099-02-01',
    });
    expect(respuesta.status).toBe(409);
  });

  it('quincena ya liquidada: 409', async () => {
    const { inicio, fin } = siguienteQuincena();
    await abrirJornadaEn(inicio);
    const colaborador = await registrarColaboradorActivo();
    await crearOrdenEfectivo(colaborador.id);
    await conToken('post', '/api/nomina/quincenas/liquidar').send({ inicio, fin });

    const segundoIntento = await conToken('post', '/api/nomina/quincenas/liquidar').send({
      inicio,
      fin,
    });
    expect(segundoIntento.status).toBe(409);
  });

  it('ya existe una liquidación de un periodo posterior: 409', async () => {
    const anterior = siguienteQuincena();
    const posterior = siguienteQuincena();
    await conToken('post', '/api/nomina/quincenas/liquidar').send(posterior);

    const respuesta = await conToken('post', '/api/nomina/quincenas/liquidar').send(anterior);
    expect(respuesta.status).toBe(409);
  });

  it('hay órdenes abiertas en el periodo: 409', async () => {
    const { inicio, fin } = siguienteQuincena();
    await abrirJornadaEn(inicio);
    const colaborador = await registrarColaboradorActivo();
    await crearOrdenEfectivo(colaborador.id, { estado: 'registrada' });

    const respuesta = await conToken('post', '/api/nomina/quincenas/liquidar').send({
      inicio,
      fin,
    });
    expect(respuesta.status).toBe(409);
  });

  it('RBAC: soporte no puede liquidar (403)', async () => {
    const { inicio, fin } = siguienteQuincena();
    const respuesta = await conToken('post', '/api/nomina/quincenas/liquidar', TOKEN_SOPORTE).send({
      inicio,
      fin,
    });
    expect(respuesta.status).toBe(403);
  });

  it('RBAC: un usuario "pendiente" no puede liquidar (403)', async () => {
    const { inicio, fin } = siguienteQuincena();
    const respuesta = await conToken(
      'post',
      '/api/nomina/quincenas/liquidar',
      TOKEN_PENDIENTE,
    ).send({
      inicio,
      fin,
    });
    expect(respuesta.status).toBe(403);
  });

  it('un superadmin también puede liquidar (201)', async () => {
    const { inicio, fin } = siguienteQuincena();
    await abrirJornadaEn(inicio);
    const colaborador = await registrarColaboradorActivo();
    await crearOrdenEfectivo(colaborador.id);

    const respuesta = await conToken(
      'post',
      '/api/nomina/quincenas/liquidar',
      TOKEN_SUPERADMIN,
    ).send({
      inicio,
      fin,
    });
    expect(respuesta.status).toBe(201);
  });

  it('requiere JWT (401 sin Authorization)', async () => {
    const respuesta = await conApiKey('post', '/api/nomina/quincenas/liquidar').send({
      inicio: '2026-01-01',
      fin: '2026-01-15',
    });
    expect(respuesta.status).toBe(401);
  });
});

describe('GET /api/nomina/liquidaciones', () => {
  it('incluye la liquidación recién creada, con total y paginación', async () => {
    const { inicio, fin } = siguienteQuincena();
    await abrirJornadaEn(inicio);
    const colaborador = await registrarColaboradorActivo();
    await crearOrdenEfectivo(colaborador.id);
    const creada = await conToken('post', '/api/nomina/quincenas/liquidar').send({ inicio, fin });

    const respuesta = await conToken('get', '/api/nomina/liquidaciones');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.liquidaciones.map((l) => l.id)).toContain(creada.body.liquidacion.id);
    expect(respuesta.body).toMatchObject({ pagina: 1, porPagina: 20 });
    expect(respuesta.body.total).toBeGreaterThanOrEqual(1);
  });

  it('porPagina por encima del máximo (100): 400', async () => {
    const respuesta = await conToken('get', '/api/nomina/liquidaciones?porPagina=101');
    expect(respuesta.status).toBe(400);
  });

  it('pagina menor a 1: 400', async () => {
    const respuesta = await conToken('get', '/api/nomina/liquidaciones?pagina=0');
    expect(respuesta.status).toBe(400);
  });
});

describe('GET /api/nomina/liquidaciones/:id', () => {
  it('caso válido: obtiene la liquidación con el detalle por colaborador (200)', async () => {
    const { inicio, fin } = siguienteQuincena();
    await abrirJornadaEn(inicio);
    const colaborador = await registrarColaboradorActivo();
    await crearOrdenEfectivo(colaborador.id);
    const creada = await conToken('post', '/api/nomina/quincenas/liquidar').send({ inicio, fin });

    const respuesta = await conToken(
      'get',
      `/api/nomina/liquidaciones/${creada.body.liquidacion.id}`,
    );

    expect(respuesta.status).toBe(200);
    const detalle = respuesta.body.liquidacion.colaboradores.find(
      (c) => c.colaboradorId === colaborador.id,
    );
    expect(detalle.colaborador).toMatchObject({
      codigo: colaborador.codigo,
      nombre: colaborador.nombre,
    });
  });

  it('id inexistente: 404', async () => {
    const respuesta = await conToken('get', '/api/nomina/liquidaciones/999999999');
    expect(respuesta.status).toBe(404);
  });

  it('id inválido: 400', async () => {
    const respuesta = await conToken('get', '/api/nomina/liquidaciones/abc');
    expect(respuesta.status).toBe(400);
  });
});

// Matriz de roles completa, con aserciones reales por endpoint (no
// inferidas de un endpoint hermano): los 4 de consulta comparten la
// misma instancia de PUEDEN_NOMINA (superadmin/administrador: 200;
// soporte/pendiente: 403; sin JWT: 401) — los 2 de escritura (POST
// /descuentos, POST /quincenas/liquidar) ya quedan cubiertos en sus
// propios describe arriba.
describe('RBAC: matriz completa de roles en los endpoints de consulta', () => {
  let colaborador;
  let liquidacionId;

  beforeAll(async () => {
    const { inicio, fin } = siguienteQuincena();
    await abrirJornadaEn(inicio);
    colaborador = await registrarColaboradorActivo();
    await crearOrdenEfectivo(colaborador.id);
    const creada = await conToken('post', '/api/nomina/quincenas/liquidar').send({ inicio, fin });
    liquidacionId = creada.body.liquidacion.id;
  });

  const ENDPOINTS_DE_CONSULTA = [
    {
      nombre: 'GET /quincenas/resumen',
      ruta: () => {
        const { inicio, fin } = siguienteQuincena();
        return `/api/nomina/quincenas/resumen?inicio=${inicio}&fin=${fin}`;
      },
    },
    {
      nombre: 'GET /colaboradores/:colaboradorId/descuentos',
      ruta: () =>
        `/api/nomina/colaboradores/${colaborador.id}/descuentos?inicio=2026-01-01&fin=2026-01-15`,
    },
    { nombre: 'GET /liquidaciones', ruta: () => '/api/nomina/liquidaciones' },
    { nombre: 'GET /liquidaciones/:id', ruta: () => `/api/nomina/liquidaciones/${liquidacionId}` },
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

    it('soporte: 403', async () => {
      const respuesta = await conToken('get', ruta(), TOKEN_SOPORTE);
      expect(respuesta.status).toBe(403);
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
