const request = require('supertest');
const { crearApp } = require('../../src/app');
const { supabase } = require('../../src/db/supabaseCliente');
const { generarToken } = require('../../src/utils/jwt.util');

const LLAVE = 'k'.repeat(40);

const app = crearApp({
  apiKeys: { postman: LLAVE, admin: 'a'.repeat(40), movil: 'm'.repeat(40), web: 'w'.repeat(40) },
  origenPermitido: 'http://localhost:5173',
});

// RBAC (SCRUM-139): todo el recurso exige API Key + JWT con rol autorizado.
// `conToken` es el helper por defecto de este archivo: la mayoría de estas
// pruebas verifican reglas de negocio (R1-R10), no RBAC —RBAC por rol ya
// se prueba a fondo en el archivo de integración de cada recurso—, así que
// basta un único token (administrador, que tiene permiso sobre todo) para
// autenticar el setup y los casos bajo prueba.
//
// autenticarJWT ya no toma el rol del payload del token: vuelve a
// consultar al usuario actual en Supabase (hallazgo de revisión del PR
// #7, SCRUM-152), así que estos ids deben ser los mismos (y en el mismo
// orden) que los 4 usuarios de supabase/seed.sql — uno por rol.
const ROLES_DE_PRUEBA = ['superadmin', 'administrador', 'soporte', 'pendiente'];
const idDeRolDePrueba = (rol) => ROLES_DE_PRUEBA.indexOf(rol) + 1;
const tokenDe = (rol) =>
  generarToken({ id: idDeRolDePrueba(rol), email: `${rol}@lavadero.com`, rol });
const TOKEN_SUPERADMIN = tokenDe('superadmin');
const TOKEN_ADMINISTRADOR = tokenDe('administrador');
const TOKEN_SOPORTE = tokenDe('soporte');
const TOKEN_PENDIENTE = tokenDe('pendiente');

// idx_jornadas_una_abierta es GLOBAL (una sola jornada abierta en todo el
// sistema, sin importar su fecha): una jornada que quedó abierta en OTRO
// archivo de pruebas (con una fecha aleatoria cualquiera) bloquearía
// abrir la de este archivo.
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

const conApiKey = (metodo, ruta) => request(app)[metodo](ruta).set('X-API-Key', LLAVE);

const conToken = (metodo, ruta, token = TOKEN_ADMINISTRADOR) =>
  conApiKey(metodo, ruta).set('Authorization', `Bearer ${token}`);

// --- Helpers de setup: registran cada recurso vía sus propios endpoints HTTP ---

// abrirJornada() NO usa POST /api/jornadas (que siempre abre la jornada de
// "hoy"): casi toda prueba de este archivo crea órdenes reales contra la
// jornada que abre, y esas órdenes quedan amarradas a ella con on delete
// restrict y nunca se borran (impedir_eliminacion) — abrir siempre "hoy"
// bloquearía esa fecha para siempre en la siguiente prueba (el mismo
// problema que las reaperturas en jornadas.service.test.js). El endpoint
// de abrir jornada en sí ya se prueba a fondo en
// tests/integration/jornadas.test.js; aquí solo hace falta "una jornada
// abierta cualquiera", así que se inserta directo con una fecha única.
const anioBaseJornada = 1000 + Math.floor(Math.random() * 9000);
// Arranca en un día aleatorio del año (no siempre en el 1): si otro
// archivo sorteara por pura casualidad el mismo año, es mucho menos
// probable que además arranque exactamente en el mismo día.
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

// clientes.service.js ya escribe en el Supabase local (SCRUM-152, Etapa
// A), no en un array que el beforeEach pudiera vaciar: el documento es
// único (salto aleatorio + contador) para no chocar ni dentro de esta
// corrida ni con filas de corridas anteriores sin un `db reset` de por medio.
const selloDocumentoCliente = Math.floor(Math.random() * 1e6)
  .toString()
  .padStart(6, '0');
let contadorDocumentoCliente = 0;
const documentoUnicoDeCliente = () => {
  contadorDocumentoCliente += 1;
  return `${selloDocumentoCliente}${String(contadorDocumentoCliente).padStart(3, '0')}`;
};

const registrarClienteParticular = async (overrides = {}) => {
  const respuesta = await conToken('post', '/api/clientes').send({
    nombre: 'Ana María Torres',
    documento: documentoUnicoDeCliente(),
    tipo: 'particular',
    telefono: '3001234567',
    ...overrides,
  });
  return respuesta.body.cliente;
};

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

// vehiculos.service.js ya escribe en el Supabase local (SCRUM-152), no en
// un array que el beforeEach pudiera vaciar: la placa es única (letras
// fijas por archivo + contador, con el formato que exige cada
// tipoVehiculo) para no chocar ni dentro de esta corrida ni con otro
// archivo que Jest ejecute en paralelo.
const LETRAS_PLACA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const letraAleatoriaPlaca = () => LETRAS_PLACA[Math.floor(Math.random() * LETRAS_PLACA.length)];
const prefijoPlaca = `${letraAleatoriaPlaca()}${letraAleatoriaPlaca()}${letraAleatoriaPlaca()}`;
const TIPOS_VEHICULO_MOTO_DE_PRUEBA = ['moto_hasta_150cc', 'moto_desde_150cc'];
let contadorPlaca = 0;
const siguientePlaca = (tipoVehiculo) => {
  contadorPlaca += 1;
  return TIPOS_VEHICULO_MOTO_DE_PRUEBA.includes(tipoVehiculo)
    ? `${prefijoPlaca}${String(contadorPlaca).padStart(2, '0')}X`
    : `${prefijoPlaca}${String(contadorPlaca).padStart(3, '0')}`;
};

const registrarVehiculo = async (clienteId, overrides = {}) => {
  const { tipoVehiculo = 'automovil', placa, ...resto } = overrides;
  const respuesta = await conToken('post', '/api/vehiculos').send({
    placa: placa ?? siguientePlaca(tipoVehiculo),
    tipoVehiculo,
    clienteId,
    ...resto,
  });
  return respuesta.body.vehiculo;
};

// colaboradores.service.js ya escribe en el Supabase local (SCRUM-152), no
// en un array que el beforeEach pudiera vaciar: el documento es único
// (salto aleatorio + contador). El código solo tiene 900 valores posibles
// (100-999, ver la migración de `colaboradores`) y un simple sorteo
// aleatorio choca con los que ya quedaron "activos" de corridas
// anteriores (nada los limpia sin un `db reset`), así que aquí se
// consulta qué códigos ya existen antes de sortear uno libre. Un
// `db reset` periódico sigue siendo necesario para que el rango no se
// agote del todo con el tiempo.
const selloColaborador = Math.floor(Math.random() * 1e6)
  .toString()
  .padStart(6, '0');
let contadorColaborador = 0;
const documentoUnicoColaborador = () => {
  contadorColaborador += 1;
  return `${selloColaborador}${String(contadorColaborador).padStart(3, '0')}`;
};

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
  throw new Error(
    'No quedan códigos de colaborador libres entre 100 y 999 (hace falta un db reset)',
  );
};

const registrarColaborador = async (overrides = {}) => {
  const { codigo, documento, ...resto } = overrides;
  const colaboradorDocumento = documento ?? documentoUnicoColaborador();
  const colaboradorCodigo = codigo ?? codigoUnicoColaborador();
  const respuesta = await conToken('post', '/api/colaboradores').send({
    codigo: colaboradorCodigo,
    nombre: 'Juan Pérez',
    documento: colaboradorDocumento,
    telefono: '3001234567',
    porcentajeComision: 0.15,
    tipoVinculacion: 'fijo',
    ...resto,
  });
  return respuesta.body.colaborador;
};

// servicios.service.js ya escribe en el Supabase local (SCRUM-152), no en
// un array que el beforeEach pudiera vaciar: el número es único (salto
// aleatorio + contador) para no chocar ni dentro de esta corrida ni con
// otro archivo que Jest ejecute en paralelo. `numero` no tiene un rango
// acotado (solo exige >= 1), así que un sorteo amplio basta.
const selloNumeroServicio = 1000 + Math.floor(Math.random() * 20000);
let contadorNumeroServicio = 0;
const numeroUnicoServicio = () => {
  contadorNumeroServicio += 1;
  return selloNumeroServicio + contadorNumeroServicio;
};

const registrarServicioParaAutomovil = async (overrides = {}) => {
  const respuesta = await conToken('post', '/api/servicios').send({
    numero: numeroUnicoServicio(),
    nombre: 'Lavado básico',
    descripcion: 'Lavado exterior con shampoo',
    categoria: 'basico',
    tarifas: [{ tipoVehiculo: 'automovil', valor: 15000 }],
    ...overrides,
  });
  return respuesta.body.servicio;
};

const registrarServicioParaMoto = async (overrides = {}) => {
  const respuesta = await conToken('post', '/api/servicios').send({
    numero: numeroUnicoServicio(),
    nombre: 'Lavado de moto',
    descripcion: 'Lavado exterior de moto',
    categoria: 'basico',
    tarifas: [{ tipoVehiculo: 'moto_hasta_150cc', valor: 8000 }],
    ...overrides,
  });
  return respuesta.body.servicio;
};

// R7 exige un numero en SERVICIOS_CON_LAVADO_MOTOR, un conjunto fijo y
// chico ([5, 6, 7, 8] en el dominio compartido): no se puede sortear uno
// grande como con el resto de servicios. Para no agotarlo ni chocar entre
// corridas (ni con el mismo fixture que usa ordenesLavado.service.test.js
// contra el mismo Supabase local), se busca primero si ya existe antes de
// crearlo.
let servicioConLavadoMotor = null;
const obtenerServicioConLavadoMotor = async () => {
  if (servicioConLavadoMotor) {
    return servicioConLavadoMotor;
  }
  const listado = await conToken('get', '/api/servicios');
  servicioConLavadoMotor = listado.body.servicios.find((servicio) => servicio.numero === 5);
  if (!servicioConLavadoMotor) {
    servicioConLavadoMotor = await registrarServicioParaAutomovil({ numero: 5 });
  }
  return servicioConLavadoMotor;
};

/** Escenario base: jornada abierta + cliente particular + vehículo + colaborador + servicio, compatibles entre sí. */
const construirEscenarioBase = async () => {
  await abrirJornada();
  const cliente = await registrarClienteParticular();
  const vehiculo = await registrarVehiculo(cliente.id);
  const colaborador = await registrarColaborador();
  const servicio = await registrarServicioParaAutomovil();
  return { cliente, vehiculo, colaborador, servicio };
};

const datosOrden = ({ vehiculo, colaborador, servicio }, overrides = {}) => ({
  turno: 1,
  vehiculoId: vehiculo.id,
  servicioId: servicio.id,
  colaboradorId: colaborador.id,
  medioPago: 'efectivo',
  ...overrides,
});

describe('POST /api/ordenes-lavado', () => {
  it('caso válido: registra una orden con el valor real de la tarifa (201)', async () => {
    const escenario = await construirEscenarioBase();

    const respuesta = await conToken('post', '/api/ordenes-lavado').send(datosOrden(escenario));

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.orden).toMatchObject({ valor: 15000, estado: 'registrada' });
  });

  it('mass assignment: ignora "valor" y "estado" enviados por el cliente (201)', async () => {
    const escenario = await construirEscenarioBase();

    const respuesta = await conToken('post', '/api/ordenes-lavado').send(
      datosOrden(escenario, { valor: 999999999, estado: 'entregada' }),
    );

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.orden.valor).toBe(15000);
    expect(respuesta.body.orden.estado).toBe('registrada');
  });

  it('rechaza crear una orden si no hay ninguna jornada abierta (409)', async () => {
    const cliente = await registrarClienteParticular();
    const vehiculo = await registrarVehiculo(cliente.id);
    const colaborador = await registrarColaborador();
    const servicio = await registrarServicioParaAutomovil();

    const respuesta = await conToken('post', '/api/ordenes-lavado').send(
      datosOrden({ vehiculo, colaborador, servicio }),
    );
    expect(respuesta.status).toBe(409);
  });

  describe('R1: el vehículo, servicio y colaborador deben existir', () => {
    it('vehiculoId inexistente: 404', async () => {
      const escenario = await construirEscenarioBase();
      const respuesta = await conToken('post', '/api/ordenes-lavado').send(
        datosOrden(escenario, { vehiculoId: 9999 }),
      );
      expect(respuesta.status).toBe(404);
    });

    it('servicioId inexistente: 404', async () => {
      const escenario = await construirEscenarioBase();
      const respuesta = await conToken('post', '/api/ordenes-lavado').send(
        datosOrden(escenario, { servicioId: 9999 }),
      );
      expect(respuesta.status).toBe(404);
    });

    it('colaboradorId inexistente: 404', async () => {
      const escenario = await construirEscenarioBase();
      const respuesta = await conToken('post', '/api/ordenes-lavado').send(
        datosOrden(escenario, { colaboradorId: 9999 }),
      );
      expect(respuesta.status).toBe(404);
    });
  });

  it('R2 "Colaborador inactivo": rechaza asignar una orden a un colaborador inactivo (409)', async () => {
    const escenario = await construirEscenarioBase();
    await conToken('patch', `/api/colaboradores/${escenario.colaborador.id}/estado`).send({
      estado: 'inactivo',
    });

    const respuesta = await conToken('post', '/api/ordenes-lavado').send(datosOrden(escenario));
    expect(respuesta.status).toBe(409);
  });

  it('R3 "Tarifa incompatible": rechaza un servicio sin tarifa para el tipo de vehículo (409)', async () => {
    await abrirJornada();
    const cliente = await registrarClienteParticular();
    const vehiculo = await registrarVehiculo(cliente.id, { tipoVehiculo: 'automovil' });
    const colaborador = await registrarColaborador();
    const servicioSoloMoto = await registrarServicioParaMoto();

    const respuesta = await conToken('post', '/api/ordenes-lavado').send(
      datosOrden({ vehiculo, colaborador, servicio: servicioSoloMoto }),
    );
    expect(respuesta.status).toBe(409);
  });

  it('R5 "Turno duplicado": rechaza un segundo turno igual en la misma jornada, con vehículos distintos (409)', async () => {
    const escenario = await construirEscenarioBase();
    const primera = await conToken('post', '/api/ordenes-lavado').send(
      datosOrden(escenario, { turno: 1 }),
    );
    expect(primera.status).toBe(201);

    const otroCliente = await registrarClienteParticular();
    const otroVehiculo = await registrarVehiculo(otroCliente.id);

    const respuesta = await conToken('post', '/api/ordenes-lavado').send(
      datosOrden({ ...escenario, vehiculo: otroVehiculo }, { turno: 1 }),
    );
    expect(respuesta.status).toBe(409);
  });

  it('R6 "Doble orden abierta": rechaza una segunda orden abierta para el mismo vehículo, y permite una nueva tras cerrar la primera (409 → 201)', async () => {
    const escenario = await construirEscenarioBase();

    const primera = await conToken('post', '/api/ordenes-lavado').send(
      datosOrden(escenario, { turno: 1 }),
    );
    expect(primera.status).toBe(201);

    const segundaMientrasAbierta = await conToken('post', '/api/ordenes-lavado').send(
      datosOrden(escenario, { turno: 2 }),
    );
    expect(segundaMientrasAbierta.status).toBe(409);

    const ordenId = primera.body.orden.id;
    await conToken('patch', `/api/ordenes-lavado/${ordenId}/estado`).send({
      estado: 'en_proceso',
    });
    await conToken('patch', `/api/ordenes-lavado/${ordenId}/estado`).send({ estado: 'terminada' });
    await conToken('patch', `/api/ordenes-lavado/${ordenId}/estado`).send({ estado: 'entregada' });

    const nuevaOrdenTrasCierre = await conToken('post', '/api/ordenes-lavado').send(
      datosOrden(escenario, { turno: 3 }),
    );
    expect(nuevaOrdenTrasCierre.status).toBe(201);
  });

  it('R7 "Motor sin autorización": rechaza un servicio con lavado de motor sin autorizaMotor, y acepta con autorizaMotor:true (409 → 201)', async () => {
    await abrirJornada();
    const cliente = await registrarClienteParticular();
    const vehiculo = await registrarVehiculo(cliente.id);
    const colaborador = await registrarColaborador();
    const servicioMotor = await obtenerServicioConLavadoMotor();

    const sinAutorizacion = await conToken('post', '/api/ordenes-lavado').send(
      datosOrden(
        { vehiculo, colaborador, servicio: servicioMotor },
        { autorizaMotor: false, turno: 1 },
      ),
    );
    expect(sinAutorizacion.status).toBe(409);

    const conAutorizacion = await conToken('post', '/api/ordenes-lavado').send(
      datosOrden(
        { vehiculo, colaborador, servicio: servicioMotor },
        { autorizaMotor: true, turno: 2 },
      ),
    );
    expect(conAutorizacion.status).toBe(201);
  });

  describe('R8 "Crédito sin convenio"', () => {
    it('rechaza medioPago credito con un cliente particular sin crédito habilitado (409)', async () => {
      await abrirJornada();
      const clienteParticular = await registrarClienteParticular();
      const vehiculo = await registrarVehiculo(clienteParticular.id);
      const colaborador = await registrarColaborador();
      const servicio = await registrarServicioParaAutomovil();

      const respuesta = await conToken('post', '/api/ordenes-lavado').send(
        datosOrden(
          { vehiculo, colaborador, servicio },
          { medioPago: 'credito', clienteId: clienteParticular.id },
        ),
      );
      expect(respuesta.status).toBe(409);
    });

    it('acepta medioPago credito con un cliente empresa con creditoHabilitado true (201)', async () => {
      await abrirJornada();
      const clienteEmpresa = await registrarClienteEmpresaConCredito();
      const clienteDuenoVehiculo = await registrarClienteParticular();
      const vehiculo = await registrarVehiculo(clienteDuenoVehiculo.id);
      const colaborador = await registrarColaborador();
      const servicio = await registrarServicioParaAutomovil();

      const respuesta = await conToken('post', '/api/ordenes-lavado').send(
        datosOrden(
          { vehiculo, colaborador, servicio },
          { medioPago: 'credito', clienteId: clienteEmpresa.id },
        ),
      );
      expect(respuesta.status).toBe(201);
      expect(respuesta.body.orden.clienteId).toBe(clienteEmpresa.id);
    });

    it('rechaza medioPago credito sin clienteId en absoluto (400, lo atrapa el validador)', async () => {
      const escenario = await construirEscenarioBase();
      const respuesta = await conToken('post', '/api/ordenes-lavado').send(
        datosOrden(escenario, { medioPago: 'credito' }),
      );
      expect(respuesta.status).toBe(400);
    });
  });

  it('requiere API Key', async () => {
    const escenario = await construirEscenarioBase();
    const respuesta = await request(app).post('/api/ordenes-lavado').send(datosOrden(escenario));
    expect(respuesta.status).toBe(401);
  });

  it('requiere JWT (401 sin Authorization, aunque la API Key sea válida)', async () => {
    const escenario = await construirEscenarioBase();
    const respuesta = await conApiKey('post', '/api/ordenes-lavado').send(datosOrden(escenario));
    expect(respuesta.status).toBe(401);
  });

  it('soporte también puede registrar órdenes (201): es su trabajo central', async () => {
    const escenario = await construirEscenarioBase();
    const respuesta = await conToken('post', '/api/ordenes-lavado', TOKEN_SOPORTE).send(
      datosOrden(escenario),
    );
    expect(respuesta.status).toBe(201);
  });

  it('RBAC: un usuario "pendiente" no puede registrar órdenes (403)', async () => {
    const escenario = await construirEscenarioBase();
    const respuesta = await conToken('post', '/api/ordenes-lavado', TOKEN_PENDIENTE).send(
      datosOrden(escenario),
    );
    expect(respuesta.status).toBe(403);
  });
});

describe('PATCH /api/ordenes-lavado/:id (editar)', () => {
  it('"Editar vehículo": edita vehiculoId, y "valor" es inmutable (no se recalcula con la tarifa del nuevo tipo) (200)', async () => {
    const escenario = await construirEscenarioBase();
    await conToken('put', `/api/servicios/${escenario.servicio.id}`).send({
      tarifas: [
        { tipoVehiculo: 'automovil', valor: 15000 },
        { tipoVehiculo: 'camioneta', valor: 20000 },
      ],
    });
    const creada = await conToken('post', '/api/ordenes-lavado').send(datosOrden(escenario));

    const nuevoVehiculo = await registrarVehiculo(escenario.cliente.id, {
      tipoVehiculo: 'camioneta',
    });

    const respuesta = await conToken('patch', `/api/ordenes-lavado/${creada.body.orden.id}`).send({
      vehiculoId: nuevoVehiculo.id,
    });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.orden.vehiculoId).toBe(nuevoVehiculo.id);
    expect(respuesta.body.orden.valor).toBe(15000);
  });

  it('"Editar con servicio inactivo": permite editar aunque el servicio original haya quedado inactivo (200)', async () => {
    const escenario = await construirEscenarioBase();
    const creada = await conToken('post', '/api/ordenes-lavado').send(datosOrden(escenario));

    await conToken('put', `/api/servicios/${escenario.servicio.id}`).send({ activo: false });

    const respuesta = await conToken('patch', `/api/ordenes-lavado/${creada.body.orden.id}`).send({
      observaciones: 'actualizado',
    });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.orden.valor).toBe(15000);
  });

  it('"Editar colaborador inactivo": rechaza editar a un colaborador inactivo (409)', async () => {
    const escenario = await construirEscenarioBase();
    const creada = await conToken('post', '/api/ordenes-lavado').send(datosOrden(escenario));

    const otroColaborador = await registrarColaborador();
    await conToken('patch', `/api/colaboradores/${otroColaborador.id}/estado`).send({
      estado: 'inactivo',
    });

    const respuesta = await conToken('patch', `/api/ordenes-lavado/${creada.body.orden.id}`).send({
      colaboradorId: otroColaborador.id,
    });
    expect(respuesta.status).toBe(409);
  });

  it('"Editar vehículo con otra orden abierta": rechaza editar vehiculoId a uno que ya tiene otra orden abierta (409)', async () => {
    const escenario = await construirEscenarioBase();
    const creada = await conToken('post', '/api/ordenes-lavado').send(
      datosOrden(escenario, { turno: 1 }),
    );

    const otroCliente = await registrarClienteParticular();
    const otroVehiculo = await registrarVehiculo(otroCliente.id);
    await conToken('post', '/api/ordenes-lavado').send(
      datosOrden({ ...escenario, vehiculo: otroVehiculo }, { turno: 2 }),
    );

    const respuesta = await conToken('patch', `/api/ordenes-lavado/${creada.body.orden.id}`).send({
      vehiculoId: otroVehiculo.id,
    });
    expect(respuesta.status).toBe(409);
  });

  it('"Editar orden cerrada": rechaza editar una orden entregada o cancelada (409)', async () => {
    const escenario = await construirEscenarioBase();
    const creada = await conToken('post', '/api/ordenes-lavado').send(datosOrden(escenario));
    const ordenId = creada.body.orden.id;

    await conToken('patch', `/api/ordenes-lavado/${ordenId}/estado`).send({
      estado: 'cancelada',
      motivo: 'Cliente canceló',
    });

    const respuesta = await conToken('patch', `/api/ordenes-lavado/${ordenId}`).send({
      observaciones: 'tarde',
    });
    expect(respuesta.status).toBe(409);
  });

  it('"Editar con jornada cerrada": rechaza editar una orden cuya jornada ya no está abierta (409)', async () => {
    const escenario = await construirEscenarioBase();
    const creada = await conToken('post', '/api/ordenes-lavado').send(datosOrden(escenario));

    const jornadasRespuesta = await conToken('get', '/api/jornadas');
    const jornadaAbierta = jornadasRespuesta.body.jornadas.find(
      (jornada) => jornada.estado === 'abierta',
    );
    await conToken('patch', `/api/jornadas/${jornadaAbierta.id}/estado`).send({
      estado: 'cerrada',
    });

    const respuesta = await conToken('patch', `/api/ordenes-lavado/${creada.body.orden.id}`).send({
      observaciones: 'tarde',
    });
    expect(respuesta.status).toBe(409);
  });

  it('"Editar a crédito sin convenio": rechaza editar medioPago a credito con un cliente sin crédito habilitado (409)', async () => {
    const escenario = await construirEscenarioBase();
    const creada = await conToken('post', '/api/ordenes-lavado').send(datosOrden(escenario));

    // El cliente del escenario es particular (sin creditoHabilitado): pasa
    // el validador (clienteId sí viene), y el service lo rechaza (R8).
    const respuesta = await conToken('patch', `/api/ordenes-lavado/${creada.body.orden.id}`).send({
      medioPago: 'credito',
      clienteId: escenario.cliente.id,
    });
    expect(respuesta.status).toBe(409);
  });

  it('"Editar mass assignment": ignora "valor" y "estado" enviados en la edición (200, sin cambios)', async () => {
    const escenario = await construirEscenarioBase();
    const creada = await conToken('post', '/api/ordenes-lavado').send(datosOrden(escenario));

    const respuesta = await conToken('patch', `/api/ordenes-lavado/${creada.body.orden.id}`).send({
      valor: 1,
      estado: 'entregada',
      observaciones: 'actualizado',
    });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.orden.valor).toBe(15000);
    expect(respuesta.body.orden.estado).toBe('registrada');
    expect(respuesta.body.orden.observaciones).toBe('actualizado');
  });
});

describe('PATCH /api/ordenes-lavado/:id/estado', () => {
  it('"Saltar estados": rechaza ir de registrada directo a entregada (409)', async () => {
    const escenario = await construirEscenarioBase();
    const creada = await conToken('post', '/api/ordenes-lavado').send(datosOrden(escenario));

    const respuesta = await conToken(
      'patch',
      `/api/ordenes-lavado/${creada.body.orden.id}/estado`,
    ).send({ estado: 'entregada' });
    expect(respuesta.status).toBe(409);
  });

  it('"Retroceder estado": rechaza volver de entregada a en_proceso (409)', async () => {
    const escenario = await construirEscenarioBase();
    const creada = await conToken('post', '/api/ordenes-lavado').send(datosOrden(escenario));
    const ordenId = creada.body.orden.id;

    await conToken('patch', `/api/ordenes-lavado/${ordenId}/estado`).send({
      estado: 'en_proceso',
    });
    await conToken('patch', `/api/ordenes-lavado/${ordenId}/estado`).send({ estado: 'terminada' });
    await conToken('patch', `/api/ordenes-lavado/${ordenId}/estado`).send({ estado: 'entregada' });

    const respuesta = await conToken('patch', `/api/ordenes-lavado/${ordenId}/estado`).send({
      estado: 'en_proceso',
    });
    expect(respuesta.status).toBe(409);
  });

  describe('"Anular sin motivo" / "Anular con motivo"', () => {
    it('rechaza cancelar sin motivo (400)', async () => {
      const escenario = await construirEscenarioBase();
      const creada = await conToken('post', '/api/ordenes-lavado').send(datosOrden(escenario));

      const respuesta = await conToken(
        'patch',
        `/api/ordenes-lavado/${creada.body.orden.id}/estado`,
      ).send({ estado: 'cancelada' });
      expect(respuesta.status).toBe(400);
    });

    it('cancela con motivo (200) y el motivo queda guardado', async () => {
      const escenario = await construirEscenarioBase();
      const creada = await conToken('post', '/api/ordenes-lavado').send(datosOrden(escenario));

      const respuesta = await conToken(
        'patch',
        `/api/ordenes-lavado/${creada.body.orden.id}/estado`,
      ).send({ estado: 'cancelada', motivo: 'El cliente no llegó' });

      expect(respuesta.status).toBe(200);
      expect(respuesta.body.orden.estado).toBe('cancelada');
      expect(respuesta.body.orden.motivo).toBe('El cliente no llegó');
    });

    it('cambiar a cualquier otro estado sin motivo sigue funcionando (200)', async () => {
      const escenario = await construirEscenarioBase();
      const creada = await conToken('post', '/api/ordenes-lavado').send(datosOrden(escenario));

      const respuesta = await conToken(
        'patch',
        `/api/ordenes-lavado/${creada.body.orden.id}/estado`,
      ).send({ estado: 'en_proceso' });

      expect(respuesta.status).toBe(200);
      expect(respuesta.body.orden.estado).toBe('en_proceso');
    });

    it('RBAC: soporte no puede anular (cancelar) una orden (403)', async () => {
      const escenario = await construirEscenarioBase();
      const creada = await conToken('post', '/api/ordenes-lavado').send(datosOrden(escenario));

      const respuesta = await conToken(
        'patch',
        `/api/ordenes-lavado/${creada.body.orden.id}/estado`,
        TOKEN_SOPORTE,
      ).send({ estado: 'cancelada', motivo: 'El cliente no llegó' });

      expect(respuesta.status).toBe(403);
    });

    it('RBAC: soporte sí puede avanzar a cualquier otro estado que no sea anular (200)', async () => {
      const escenario = await construirEscenarioBase();
      const creada = await conToken('post', '/api/ordenes-lavado').send(datosOrden(escenario));

      const respuesta = await conToken(
        'patch',
        `/api/ordenes-lavado/${creada.body.orden.id}/estado`,
        TOKEN_SOPORTE,
      ).send({ estado: 'en_proceso' });

      expect(respuesta.status).toBe(200);
    });

    it('RBAC: superadmin también puede anular (cancelar) una orden (200)', async () => {
      const escenario = await construirEscenarioBase();
      const creada = await conToken('post', '/api/ordenes-lavado').send(datosOrden(escenario));

      const respuesta = await conToken(
        'patch',
        `/api/ordenes-lavado/${creada.body.orden.id}/estado`,
        TOKEN_SUPERADMIN,
      ).send({ estado: 'cancelada', motivo: 'El cliente no llegó' });

      expect(respuesta.status).toBe(200);
    });
  });
});

describe('GET /api/ordenes-lavado', () => {
  it('filtra por fecha exacta cuando se envía ?fecha=', async () => {
    const escenario = await construirEscenarioBase();
    const creada = await conToken('post', '/api/ordenes-lavado').send(datosOrden(escenario));
    const fechaDeLaOrden = creada.body.orden.fecha;

    const respuesta = await conToken('get', `/api/ordenes-lavado?fecha=${fechaDeLaOrden}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.ordenes).toHaveLength(1);
    expect(respuesta.body.ordenes[0].fecha).toBe(fechaDeLaOrden);
  });

  it('SCRUM-36: "totales" coincide exactamente con la suma manual, y una orden anulada no suma', async () => {
    const escenario = await construirEscenarioBase();

    // Orden 1: efectivo, se queda registrada.
    const orden1 = await conToken('post', '/api/ordenes-lavado').send(
      datosOrden(escenario, { turno: 1, medioPago: 'efectivo' }),
    );
    // Las órdenes nunca se borran (impedir_eliminacion): se acota la
    // consulta final por jornadaId para que la suma no incluya órdenes de
    // otras pruebas (de este archivo o de corridas anteriores sin reset).
    const jornadaId = orden1.body.orden.jornadaId;

    // Orden 2: nequi (otro vehículo), se queda registrada.
    const clienteB = await registrarClienteParticular();
    const vehiculoB = await registrarVehiculo(clienteB.id);
    await conToken('post', '/api/ordenes-lavado').send(
      datosOrden({ ...escenario, vehiculo: vehiculoB }, { turno: 2, medioPago: 'nequi' }),
    );

    // Orden 3: efectivo (otro vehículo), pero se cancela: NO debe sumar a nada.
    const clienteC = await registrarClienteParticular();
    const vehiculoC = await registrarVehiculo(clienteC.id);
    const orden3 = await conToken('post', '/api/ordenes-lavado').send(
      datosOrden({ ...escenario, vehiculo: vehiculoC }, { turno: 3, medioPago: 'efectivo' }),
    );
    await conToken('patch', `/api/ordenes-lavado/${orden3.body.orden.id}/estado`).send({
      estado: 'cancelada',
      motivo: 'Cliente canceló',
    });

    const respuesta = await conToken('get', `/api/ordenes-lavado?jornadaId=${jornadaId}`);

    expect(respuesta.status).toBe(200);
    // Las 3 órdenes siguen apareciendo en el listado, incluida la anulada.
    expect(respuesta.body.ordenes).toHaveLength(3);

    // Suma manual sobre lo que el cliente realmente ve en "ordenes", para
    // probar que "totales" coincide EXACTAMENTE con esa cuenta a mano.
    const sumaManual = respuesta.body.ordenes
      .filter((orden) => orden.estado !== 'cancelada')
      .reduce(
        (acumulado, orden) => {
          acumulado.cantidadServicios += 1;
          acumulado.totalGeneral += orden.valor;
          acumulado.totalesPorMedioPago[orden.medioPago] =
            (acumulado.totalesPorMedioPago[orden.medioPago] ?? 0) + orden.valor;
          return acumulado;
        },
        { cantidadServicios: 0, totalGeneral: 0, totalesPorMedioPago: {} },
      );

    expect(respuesta.body.totales.cantidadServicios).toBe(sumaManual.cantidadServicios);
    expect(respuesta.body.totales.totalGeneral).toBe(sumaManual.totalGeneral);
    expect(respuesta.body.totales.totalesPorMedioPago.efectivo).toBe(
      sumaManual.totalesPorMedioPago.efectivo,
    );
    expect(respuesta.body.totales.totalesPorMedioPago.nequi).toBe(
      sumaManual.totalesPorMedioPago.nequi,
    );

    // Y en números concretos: la cancelada (efectivo) no cuenta para nada.
    expect(respuesta.body.totales.cantidadServicios).toBe(2);
    expect(respuesta.body.totales.totalGeneral).toBe(30000);
    expect(respuesta.body.totales.totalesPorMedioPago.efectivo).toBe(15000);
    expect(respuesta.body.totales.totalesPorMedioPago.nequi).toBe(15000);
  });

  it('filtra por colaboradorId, servicioId, medioPago y jornadaId vía HTTP', async () => {
    const escenario = await construirEscenarioBase();
    const orden1 = await conToken('post', '/api/ordenes-lavado').send(
      datosOrden(escenario, { turno: 1, medioPago: 'efectivo' }),
    );

    const clienteB = await registrarClienteParticular();
    const vehiculoB = await registrarVehiculo(clienteB.id);
    const colaboradorB = await registrarColaborador();
    const servicioB = await registrarServicioParaAutomovil();
    await conToken('post', '/api/ordenes-lavado').send(
      datosOrden(
        { vehiculo: vehiculoB, colaborador: colaboradorB, servicio: servicioB },
        { turno: 2, medioPago: 'nequi' },
      ),
    );

    const porColaborador = await conToken(
      'get',
      `/api/ordenes-lavado?colaboradorId=${escenario.colaborador.id}`,
    );
    expect(porColaborador.body.ordenes).toHaveLength(1);
    expect(porColaborador.body.ordenes[0].colaboradorId).toBe(escenario.colaborador.id);

    const porServicio = await conToken(
      'get',
      `/api/ordenes-lavado?servicioId=${escenario.servicio.id}`,
    );
    expect(porServicio.body.ordenes).toHaveLength(1);

    // medioPago por sí solo no es exclusivo de esta prueba (otras también
    // usan 'nequi'), y las órdenes nunca se borran: se acota también por
    // jornadaId, única para esta prueba.
    const jornadaId = orden1.body.orden.jornadaId;
    const porMedioPago = await conToken(
      'get',
      `/api/ordenes-lavado?medioPago=nequi&jornadaId=${jornadaId}`,
    );
    expect(porMedioPago.body.ordenes).toHaveLength(1);
    expect(porMedioPago.body.ordenes[0].medioPago).toBe('nequi');

    const porJornada = await conToken('get', `/api/ordenes-lavado?jornadaId=${jornadaId}`);
    expect(porJornada.body.ordenes).toHaveLength(2);
  });
});

describe('GET /api/ordenes-lavado/:id', () => {
  it('id inexistente: 404', async () => {
    const respuesta = await conToken('get', '/api/ordenes-lavado/9999');
    expect(respuesta.status).toBe(404);
  });

  it('id inválido: 400', async () => {
    const respuesta = await conToken('get', '/api/ordenes-lavado/abc');
    expect(respuesta.status).toBe(400);
  });

  it('RBAC: un usuario "pendiente" no puede consultar (403)', async () => {
    const respuesta = await conToken('get', '/api/ordenes-lavado/9999', TOKEN_PENDIENTE);
    expect(respuesta.status).toBe(403);
  });

  it('requiere JWT (401 sin Authorization)', async () => {
    const respuesta = await conApiKey('get', '/api/ordenes-lavado/9999');
    expect(respuesta.status).toBe(401);
  });
});
