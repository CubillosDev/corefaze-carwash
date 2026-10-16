const request = require('supertest');
const { crearApp } = require('../../src/app');
const clientes = require('../../src/data/clientes');
const vehiculos = require('../../src/data/vehiculos');
const colaboradores = require('../../src/data/colaboradores');
const servicios = require('../../src/data/servicios');
const ordenesLavado = require('../../src/data/ordenesLavado');

const LLAVE = 'k'.repeat(40);

const app = crearApp({
  apiKeys: { postman: LLAVE, admin: 'a'.repeat(40), movil: 'm'.repeat(40) },
  origenPermitido: 'http://localhost:5173',
});

beforeEach(() => {
  clientes.length = 0;
  vehiculos.length = 0;
  colaboradores.length = 0;
  servicios.length = 0;
  ordenesLavado.length = 0;
});

const conApiKey = (metodo, ruta) => request(app)[metodo](ruta).set('X-API-Key', LLAVE);

// --- Helpers de setup: registran cada recurso vía sus propios endpoints HTTP ---

const registrarClienteParticular = async (overrides = {}) => {
  const respuesta = await conApiKey('post', '/api/clientes').send({
    nombre: 'Ana María Torres',
    documento: '1010101010',
    tipo: 'particular',
    telefono: '3001234567',
    ...overrides,
  });
  return respuesta.body.cliente;
};

const registrarClienteEmpresaConCredito = async (overrides = {}) => {
  const respuesta = await conApiKey('post', '/api/clientes').send({
    nombre: 'Constructora Ejemplo S.A.S.',
    documento: '900123456',
    tipo: 'empresa',
    telefono: '3009876543',
    creditoHabilitado: true,
    ...overrides,
  });
  return respuesta.body.cliente;
};

const registrarVehiculo = async (clienteId, overrides = {}) => {
  const respuesta = await conApiKey('post', '/api/vehiculos').send({
    placa: 'ABC123',
    tipo: 'automovil',
    clienteId,
    ...overrides,
  });
  return respuesta.body.vehiculo;
};

const registrarColaborador = async (overrides = {}) => {
  const respuesta = await conApiKey('post', '/api/colaboradores').send({
    codigo: 401,
    nombre: 'Juan Pérez',
    documento: '1020304050',
    telefono: '3001234567',
    porcentajeComision: 0.15,
    tipoVinculacion: 'fijo',
    ...overrides,
  });
  return respuesta.body.colaborador;
};

const registrarServicioParaAutomovil = async (overrides = {}) => {
  const respuesta = await conApiKey('post', '/api/servicios').send({
    numero: 1,
    nombre: 'Lavado básico',
    descripcion: 'Lavado exterior con shampoo',
    categoria: 'basico',
    tarifas: [{ tipoVehiculo: 'automovil', valor: 15000 }],
    ...overrides,
  });
  return respuesta.body.servicio;
};

const registrarServicioParaMoto = async (overrides = {}) => {
  const respuesta = await conApiKey('post', '/api/servicios').send({
    numero: 2,
    nombre: 'Lavado de moto',
    descripcion: 'Lavado exterior de moto',
    categoria: 'basico',
    tarifas: [{ tipoVehiculo: 'moto_hasta_150cc', valor: 8000 }],
    ...overrides,
  });
  return respuesta.body.servicio;
};

/** Escenario base: cliente particular + vehículo + colaborador + servicio, todos compatibles entre sí. */
const construirEscenarioBase = async () => {
  const cliente = await registrarClienteParticular();
  const vehiculo = await registrarVehiculo(cliente.id);
  const colaborador = await registrarColaborador();
  const servicio = await registrarServicioParaAutomovil();
  return { cliente, vehiculo, colaborador, servicio };
};

const datosOrden = ({ vehiculo, colaborador, servicio }, overrides = {}) => ({
  fecha: '2026-01-10',
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

    const respuesta = await conApiKey('post', '/api/ordenes-lavado').send(datosOrden(escenario));

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.orden).toMatchObject({ valor: 15000, estado: 'registrada' });
  });

  it('mass assignment: ignora "valor" y "estado" enviados por el cliente (201)', async () => {
    const escenario = await construirEscenarioBase();

    const respuesta = await conApiKey('post', '/api/ordenes-lavado').send(
      datosOrden(escenario, { valor: 999999999, estado: 'entregada' }),
    );

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.orden.valor).toBe(15000);
    expect(respuesta.body.orden.estado).toBe('registrada');
  });

  describe('R1: el vehículo, servicio y colaborador deben existir', () => {
    it('vehiculoId inexistente: 404', async () => {
      const escenario = await construirEscenarioBase();
      const respuesta = await conApiKey('post', '/api/ordenes-lavado').send(
        datosOrden(escenario, { vehiculoId: 9999 }),
      );
      expect(respuesta.status).toBe(404);
    });

    it('servicioId inexistente: 404', async () => {
      const escenario = await construirEscenarioBase();
      const respuesta = await conApiKey('post', '/api/ordenes-lavado').send(
        datosOrden(escenario, { servicioId: 9999 }),
      );
      expect(respuesta.status).toBe(404);
    });

    it('colaboradorId inexistente: 404', async () => {
      const escenario = await construirEscenarioBase();
      const respuesta = await conApiKey('post', '/api/ordenes-lavado').send(
        datosOrden(escenario, { colaboradorId: 9999 }),
      );
      expect(respuesta.status).toBe(404);
    });
  });

  it('R2 "Colaborador inactivo": rechaza asignar una orden a un colaborador inactivo (409)', async () => {
    const escenario = await construirEscenarioBase();
    await conApiKey('patch', `/api/colaboradores/${escenario.colaborador.id}/estado`).send({
      estado: 'inactivo',
    });

    const respuesta = await conApiKey('post', '/api/ordenes-lavado').send(datosOrden(escenario));
    expect(respuesta.status).toBe(409);
  });

  it('R3 "Tarifa incompatible": rechaza un servicio sin tarifa para el tipo de vehículo (409)', async () => {
    const cliente = await registrarClienteParticular();
    const vehiculo = await registrarVehiculo(cliente.id, { tipo: 'automovil' });
    const colaborador = await registrarColaborador();
    const servicioSoloMoto = await registrarServicioParaMoto();

    const respuesta = await conApiKey('post', '/api/ordenes-lavado').send(
      datosOrden({ vehiculo, colaborador, servicio: servicioSoloMoto }),
    );
    expect(respuesta.status).toBe(409);
  });

  it('R5 "Turno duplicado": rechaza un segundo turno igual en la misma fecha, con vehículos distintos (409)', async () => {
    const escenario = await construirEscenarioBase();
    const primera = await conApiKey('post', '/api/ordenes-lavado').send(
      datosOrden(escenario, { fecha: '2026-01-10', turno: 1 }),
    );
    expect(primera.status).toBe(201);

    const otroCliente = await registrarClienteParticular({ documento: '1010101099' });
    const otroVehiculo = await registrarVehiculo(otroCliente.id, { placa: 'XYZ789' });

    const respuesta = await conApiKey('post', '/api/ordenes-lavado').send(
      datosOrden({ ...escenario, vehiculo: otroVehiculo }, { fecha: '2026-01-10', turno: 1 }),
    );
    expect(respuesta.status).toBe(409);
  });

  it('R6 "Doble orden abierta": rechaza una segunda orden abierta para el mismo vehículo, y permite una nueva tras cerrar la primera (409 → 201)', async () => {
    const escenario = await construirEscenarioBase();

    const primera = await conApiKey('post', '/api/ordenes-lavado').send(
      datosOrden(escenario, { turno: 1 }),
    );
    expect(primera.status).toBe(201);

    const segundaMientrasAbierta = await conApiKey('post', '/api/ordenes-lavado').send(
      datosOrden(escenario, { turno: 2 }),
    );
    expect(segundaMientrasAbierta.status).toBe(409);

    const ordenId = primera.body.orden.id;
    await conApiKey('patch', `/api/ordenes-lavado/${ordenId}/estado`).send({
      estado: 'en_proceso',
    });
    await conApiKey('patch', `/api/ordenes-lavado/${ordenId}/estado`).send({ estado: 'terminada' });
    await conApiKey('patch', `/api/ordenes-lavado/${ordenId}/estado`).send({ estado: 'entregada' });

    const nuevaOrdenTrasCierre = await conApiKey('post', '/api/ordenes-lavado').send(
      datosOrden(escenario, { turno: 3 }),
    );
    expect(nuevaOrdenTrasCierre.status).toBe(201);
  });

  it('R7 "Motor sin autorización": rechaza un servicio con lavado de motor sin autorizaMotor, y acepta con autorizaMotor:true (409 → 201)', async () => {
    const cliente = await registrarClienteParticular();
    const vehiculo = await registrarVehiculo(cliente.id);
    const colaborador = await registrarColaborador();
    const servicioMotor = await registrarServicioParaAutomovil({ numero: 5 });

    const sinAutorizacion = await conApiKey('post', '/api/ordenes-lavado').send(
      datosOrden(
        { vehiculo, colaborador, servicio: servicioMotor },
        { autorizaMotor: false, turno: 1 },
      ),
    );
    expect(sinAutorizacion.status).toBe(409);

    const conAutorizacion = await conApiKey('post', '/api/ordenes-lavado').send(
      datosOrden(
        { vehiculo, colaborador, servicio: servicioMotor },
        { autorizaMotor: true, turno: 2 },
      ),
    );
    expect(conAutorizacion.status).toBe(201);
  });

  describe('R8 "Crédito sin convenio"', () => {
    it('rechaza medioPago credito con un cliente particular sin crédito habilitado (409)', async () => {
      const clienteParticular = await registrarClienteParticular();
      const vehiculo = await registrarVehiculo(clienteParticular.id);
      const colaborador = await registrarColaborador();
      const servicio = await registrarServicioParaAutomovil();

      const respuesta = await conApiKey('post', '/api/ordenes-lavado').send(
        datosOrden(
          { vehiculo, colaborador, servicio },
          { medioPago: 'credito', clienteId: clienteParticular.id },
        ),
      );
      expect(respuesta.status).toBe(409);
    });

    it('acepta medioPago credito con un cliente empresa con creditoHabilitado true (201)', async () => {
      const clienteEmpresa = await registrarClienteEmpresaConCredito();
      const clienteDuenoVehiculo = await registrarClienteParticular();
      const vehiculo = await registrarVehiculo(clienteDuenoVehiculo.id);
      const colaborador = await registrarColaborador();
      const servicio = await registrarServicioParaAutomovil();

      const respuesta = await conApiKey('post', '/api/ordenes-lavado').send(
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
      const respuesta = await conApiKey('post', '/api/ordenes-lavado').send(
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
});

describe('PATCH /api/ordenes-lavado/:id/estado', () => {
  it('"Saltar estados": rechaza ir de registrada directo a entregada (409)', async () => {
    const escenario = await construirEscenarioBase();
    const creada = await conApiKey('post', '/api/ordenes-lavado').send(datosOrden(escenario));

    const respuesta = await conApiKey(
      'patch',
      `/api/ordenes-lavado/${creada.body.orden.id}/estado`,
    ).send({ estado: 'entregada' });
    expect(respuesta.status).toBe(409);
  });

  it('"Retroceder estado": rechaza volver de entregada a en_proceso (409)', async () => {
    const escenario = await construirEscenarioBase();
    const creada = await conApiKey('post', '/api/ordenes-lavado').send(datosOrden(escenario));
    const ordenId = creada.body.orden.id;

    await conApiKey('patch', `/api/ordenes-lavado/${ordenId}/estado`).send({
      estado: 'en_proceso',
    });
    await conApiKey('patch', `/api/ordenes-lavado/${ordenId}/estado`).send({ estado: 'terminada' });
    await conApiKey('patch', `/api/ordenes-lavado/${ordenId}/estado`).send({ estado: 'entregada' });

    const respuesta = await conApiKey('patch', `/api/ordenes-lavado/${ordenId}/estado`).send({
      estado: 'en_proceso',
    });
    expect(respuesta.status).toBe(409);
  });
});

describe('GET /api/ordenes-lavado', () => {
  it('filtra por fecha exacta cuando se envía ?fecha=', async () => {
    const escenario = await construirEscenarioBase();
    await conApiKey('post', '/api/ordenes-lavado').send(
      datosOrden(escenario, { fecha: '2026-01-10', turno: 1 }),
    );

    const otroCliente = await registrarClienteParticular({ documento: '1010101098' });
    const otroVehiculo = await registrarVehiculo(otroCliente.id, { placa: 'XYZ789' });
    await conApiKey('post', '/api/ordenes-lavado').send(
      datosOrden({ ...escenario, vehiculo: otroVehiculo }, { fecha: '2026-01-11', turno: 1 }),
    );

    const respuesta = await conApiKey('get', '/api/ordenes-lavado?fecha=2026-01-10');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.ordenes).toHaveLength(1);
    expect(respuesta.body.ordenes[0].fecha).toBe('2026-01-10');
  });
});

describe('GET /api/ordenes-lavado/:id', () => {
  it('id inexistente: 404', async () => {
    const respuesta = await conApiKey('get', '/api/ordenes-lavado/9999');
    expect(respuesta.status).toBe(404);
  });

  it('id inválido: 400', async () => {
    const respuesta = await conApiKey('get', '/api/ordenes-lavado/abc');
    expect(respuesta.status).toBe(400);
  });
});
