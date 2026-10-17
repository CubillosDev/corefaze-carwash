const request = require('supertest');
const { crearApp } = require('../../src/app');
const clientes = require('../../src/data/clientes');
const vehiculos = require('../../src/data/vehiculos');
const colaboradores = require('../../src/data/colaboradores');
const servicios = require('../../src/data/servicios');
const ordenesLavado = require('../../src/data/ordenesLavado');
const jornadas = require('../../src/data/jornadas');

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
  jornadas.length = 0;
});

const conApiKey = (metodo, ruta) => request(app)[metodo](ruta).set('X-API-Key', LLAVE);

// --- Helpers de setup: registran cada recurso vía sus propios endpoints HTTP ---

const abrirJornada = async () => {
  const respuesta = await conApiKey('post', '/api/jornadas');
  return respuesta.body.jornada;
};

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
    tipoVehiculo: 'automovil',
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

  it('rechaza crear una orden si no hay ninguna jornada abierta (409)', async () => {
    const cliente = await registrarClienteParticular();
    const vehiculo = await registrarVehiculo(cliente.id);
    const colaborador = await registrarColaborador();
    const servicio = await registrarServicioParaAutomovil();

    const respuesta = await conApiKey('post', '/api/ordenes-lavado').send(
      datosOrden({ vehiculo, colaborador, servicio }),
    );
    expect(respuesta.status).toBe(409);
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
    await abrirJornada();
    const cliente = await registrarClienteParticular();
    const vehiculo = await registrarVehiculo(cliente.id, { tipoVehiculo: 'automovil' });
    const colaborador = await registrarColaborador();
    const servicioSoloMoto = await registrarServicioParaMoto();

    const respuesta = await conApiKey('post', '/api/ordenes-lavado').send(
      datosOrden({ vehiculo, colaborador, servicio: servicioSoloMoto }),
    );
    expect(respuesta.status).toBe(409);
  });

  it('R5 "Turno duplicado": rechaza un segundo turno igual en la misma jornada, con vehículos distintos (409)', async () => {
    const escenario = await construirEscenarioBase();
    const primera = await conApiKey('post', '/api/ordenes-lavado').send(
      datosOrden(escenario, { turno: 1 }),
    );
    expect(primera.status).toBe(201);

    const otroCliente = await registrarClienteParticular({ documento: '1010101099' });
    const otroVehiculo = await registrarVehiculo(otroCliente.id, { placa: 'XYZ789' });

    const respuesta = await conApiKey('post', '/api/ordenes-lavado').send(
      datosOrden({ ...escenario, vehiculo: otroVehiculo }, { turno: 1 }),
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
    await abrirJornada();
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
      await abrirJornada();
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
      await abrirJornada();
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

describe('PATCH /api/ordenes-lavado/:id (editar)', () => {
  it('"Editar vehículo": edita vehiculoId, y "valor" es inmutable (no se recalcula con la tarifa del nuevo tipo) (200)', async () => {
    const escenario = await construirEscenarioBase();
    await conApiKey('put', `/api/servicios/${escenario.servicio.id}`).send({
      tarifas: [
        { tipoVehiculo: 'automovil', valor: 15000 },
        { tipoVehiculo: 'camioneta', valor: 20000 },
      ],
    });
    const creada = await conApiKey('post', '/api/ordenes-lavado').send(datosOrden(escenario));

    const nuevoVehiculo = await registrarVehiculo(escenario.cliente.id, {
      placa: 'XYZ789',
      tipoVehiculo: 'camioneta',
    });

    const respuesta = await conApiKey('patch', `/api/ordenes-lavado/${creada.body.orden.id}`).send({
      vehiculoId: nuevoVehiculo.id,
    });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.orden.vehiculoId).toBe(nuevoVehiculo.id);
    expect(respuesta.body.orden.valor).toBe(15000);
  });

  it('"Editar con servicio inactivo": permite editar aunque el servicio original haya quedado inactivo (200)', async () => {
    const escenario = await construirEscenarioBase();
    const creada = await conApiKey('post', '/api/ordenes-lavado').send(datosOrden(escenario));

    await conApiKey('put', `/api/servicios/${escenario.servicio.id}`).send({ activo: false });

    const respuesta = await conApiKey('patch', `/api/ordenes-lavado/${creada.body.orden.id}`).send({
      observaciones: 'actualizado',
    });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.orden.valor).toBe(15000);
  });

  it('"Editar colaborador inactivo": rechaza editar a un colaborador inactivo (409)', async () => {
    const escenario = await construirEscenarioBase();
    const creada = await conApiKey('post', '/api/ordenes-lavado').send(datosOrden(escenario));

    const otroColaborador = await registrarColaborador({ codigo: 402, documento: '1020304099' });
    await conApiKey('patch', `/api/colaboradores/${otroColaborador.id}/estado`).send({
      estado: 'inactivo',
    });

    const respuesta = await conApiKey('patch', `/api/ordenes-lavado/${creada.body.orden.id}`).send({
      colaboradorId: otroColaborador.id,
    });
    expect(respuesta.status).toBe(409);
  });

  it('"Editar vehículo con otra orden abierta": rechaza editar vehiculoId a uno que ya tiene otra orden abierta (409)', async () => {
    const escenario = await construirEscenarioBase();
    const creada = await conApiKey('post', '/api/ordenes-lavado').send(
      datosOrden(escenario, { turno: 1 }),
    );

    const otroCliente = await registrarClienteParticular({ documento: '1010101098' });
    const otroVehiculo = await registrarVehiculo(otroCliente.id, { placa: 'XYZ789' });
    await conApiKey('post', '/api/ordenes-lavado').send(
      datosOrden({ ...escenario, vehiculo: otroVehiculo }, { turno: 2 }),
    );

    const respuesta = await conApiKey('patch', `/api/ordenes-lavado/${creada.body.orden.id}`).send({
      vehiculoId: otroVehiculo.id,
    });
    expect(respuesta.status).toBe(409);
  });

  it('"Editar orden cerrada": rechaza editar una orden entregada o cancelada (409)', async () => {
    const escenario = await construirEscenarioBase();
    const creada = await conApiKey('post', '/api/ordenes-lavado').send(datosOrden(escenario));
    const ordenId = creada.body.orden.id;

    await conApiKey('patch', `/api/ordenes-lavado/${ordenId}/estado`).send({
      estado: 'cancelada',
      motivo: 'Cliente canceló',
    });

    const respuesta = await conApiKey('patch', `/api/ordenes-lavado/${ordenId}`).send({
      observaciones: 'tarde',
    });
    expect(respuesta.status).toBe(409);
  });

  it('"Editar con jornada cerrada": rechaza editar una orden cuya jornada ya no está abierta (409)', async () => {
    const escenario = await construirEscenarioBase();
    const creada = await conApiKey('post', '/api/ordenes-lavado').send(datosOrden(escenario));

    const jornadasRespuesta = await conApiKey('get', '/api/jornadas');
    const jornadaAbierta = jornadasRespuesta.body.jornadas.find(
      (jornada) => jornada.estado === 'abierta',
    );
    await conApiKey('patch', `/api/jornadas/${jornadaAbierta.id}/estado`).send({
      estado: 'cerrada',
    });

    const respuesta = await conApiKey('patch', `/api/ordenes-lavado/${creada.body.orden.id}`).send({
      observaciones: 'tarde',
    });
    expect(respuesta.status).toBe(409);
  });

  it('"Editar a crédito sin convenio": rechaza editar medioPago a credito con un cliente sin crédito habilitado (409)', async () => {
    const escenario = await construirEscenarioBase();
    const creada = await conApiKey('post', '/api/ordenes-lavado').send(datosOrden(escenario));

    // El cliente del escenario es particular (sin creditoHabilitado): pasa
    // el validador (clienteId sí viene), y el service lo rechaza (R8).
    const respuesta = await conApiKey('patch', `/api/ordenes-lavado/${creada.body.orden.id}`).send({
      medioPago: 'credito',
      clienteId: escenario.cliente.id,
    });
    expect(respuesta.status).toBe(409);
  });

  it('"Editar mass assignment": ignora "valor" y "estado" enviados en la edición (200, sin cambios)', async () => {
    const escenario = await construirEscenarioBase();
    const creada = await conApiKey('post', '/api/ordenes-lavado').send(datosOrden(escenario));

    const respuesta = await conApiKey('patch', `/api/ordenes-lavado/${creada.body.orden.id}`).send({
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

  describe('"Anular sin motivo" / "Anular con motivo"', () => {
    it('rechaza cancelar sin motivo (400)', async () => {
      const escenario = await construirEscenarioBase();
      const creada = await conApiKey('post', '/api/ordenes-lavado').send(datosOrden(escenario));

      const respuesta = await conApiKey(
        'patch',
        `/api/ordenes-lavado/${creada.body.orden.id}/estado`,
      ).send({ estado: 'cancelada' });
      expect(respuesta.status).toBe(400);
    });

    it('cancela con motivo (200) y el motivo queda guardado', async () => {
      const escenario = await construirEscenarioBase();
      const creada = await conApiKey('post', '/api/ordenes-lavado').send(datosOrden(escenario));

      const respuesta = await conApiKey(
        'patch',
        `/api/ordenes-lavado/${creada.body.orden.id}/estado`,
      ).send({ estado: 'cancelada', motivo: 'El cliente no llegó' });

      expect(respuesta.status).toBe(200);
      expect(respuesta.body.orden.estado).toBe('cancelada');
      expect(respuesta.body.orden.motivo).toBe('El cliente no llegó');
    });

    it('cambiar a cualquier otro estado sin motivo sigue funcionando (200)', async () => {
      const escenario = await construirEscenarioBase();
      const creada = await conApiKey('post', '/api/ordenes-lavado').send(datosOrden(escenario));

      const respuesta = await conApiKey(
        'patch',
        `/api/ordenes-lavado/${creada.body.orden.id}/estado`,
      ).send({ estado: 'en_proceso' });

      expect(respuesta.status).toBe(200);
      expect(respuesta.body.orden.estado).toBe('en_proceso');
    });
  });
});

describe('GET /api/ordenes-lavado', () => {
  it('filtra por fecha exacta cuando se envía ?fecha=', async () => {
    const escenario = await construirEscenarioBase();
    const creada = await conApiKey('post', '/api/ordenes-lavado').send(datosOrden(escenario));
    const fechaDeLaOrden = creada.body.orden.fecha;

    const respuesta = await conApiKey('get', `/api/ordenes-lavado?fecha=${fechaDeLaOrden}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.ordenes).toHaveLength(1);
    expect(respuesta.body.ordenes[0].fecha).toBe(fechaDeLaOrden);
  });

  it('SCRUM-36: "totales" coincide exactamente con la suma manual, y una orden anulada no suma', async () => {
    const escenario = await construirEscenarioBase();

    // Orden 1: efectivo, se queda registrada.
    await conApiKey('post', '/api/ordenes-lavado').send(
      datosOrden(escenario, { turno: 1, medioPago: 'efectivo' }),
    );

    // Orden 2: nequi (otro vehículo), se queda registrada.
    const clienteB = await registrarClienteParticular({ documento: '1010101097' });
    const vehiculoB = await registrarVehiculo(clienteB.id, { placa: 'XYZ789' });
    await conApiKey('post', '/api/ordenes-lavado').send(
      datosOrden({ ...escenario, vehiculo: vehiculoB }, { turno: 2, medioPago: 'nequi' }),
    );

    // Orden 3: efectivo (otro vehículo), pero se cancela: NO debe sumar a nada.
    const clienteC = await registrarClienteParticular({ documento: '1010101096' });
    const vehiculoC = await registrarVehiculo(clienteC.id, { placa: 'DEF456' });
    const orden3 = await conApiKey('post', '/api/ordenes-lavado').send(
      datosOrden({ ...escenario, vehiculo: vehiculoC }, { turno: 3, medioPago: 'efectivo' }),
    );
    await conApiKey('patch', `/api/ordenes-lavado/${orden3.body.orden.id}/estado`).send({
      estado: 'cancelada',
      motivo: 'Cliente canceló',
    });

    const respuesta = await conApiKey('get', '/api/ordenes-lavado');

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
    const orden1 = await conApiKey('post', '/api/ordenes-lavado').send(
      datosOrden(escenario, { turno: 1, medioPago: 'efectivo' }),
    );

    const clienteB = await registrarClienteParticular({ documento: '1010101095' });
    const vehiculoB = await registrarVehiculo(clienteB.id, { placa: 'GHI789' });
    const colaboradorB = await registrarColaborador({ codigo: 402, documento: '1020304098' });
    const servicioB = await registrarServicioParaAutomovil({ numero: 2 });
    await conApiKey('post', '/api/ordenes-lavado').send(
      datosOrden(
        { vehiculo: vehiculoB, colaborador: colaboradorB, servicio: servicioB },
        { turno: 2, medioPago: 'nequi' },
      ),
    );

    const porColaborador = await conApiKey(
      'get',
      `/api/ordenes-lavado?colaboradorId=${escenario.colaborador.id}`,
    );
    expect(porColaborador.body.ordenes).toHaveLength(1);
    expect(porColaborador.body.ordenes[0].colaboradorId).toBe(escenario.colaborador.id);

    const porServicio = await conApiKey(
      'get',
      `/api/ordenes-lavado?servicioId=${escenario.servicio.id}`,
    );
    expect(porServicio.body.ordenes).toHaveLength(1);

    const porMedioPago = await conApiKey('get', '/api/ordenes-lavado?medioPago=nequi');
    expect(porMedioPago.body.ordenes).toHaveLength(1);
    expect(porMedioPago.body.ordenes[0].medioPago).toBe('nequi');

    const jornadaId = orden1.body.orden.jornadaId;
    const porJornada = await conApiKey('get', `/api/ordenes-lavado?jornadaId=${jornadaId}`);
    expect(porJornada.body.ordenes).toHaveLength(2);
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
