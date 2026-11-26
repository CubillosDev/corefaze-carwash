const {
  supabase,
  conApiKey,
  conRol,
  conToken,
  cerrarJornadaYCajaAbiertas,
  abrirJornada,
  registrarCliente,
  fijarArchivoDelServicio,
  crearOrden,
} = require('../utils/escenarioPanel');

fijarArchivoDelServicio(__filename);

beforeEach(async () => {
  await cerrarJornadaYCajaAbiertas();
});

describe('RBAC de /api/caja', () => {
  it('exige token y rol que opere', async () => {
    expect((await conApiKey('get', '/api/caja')).status).toBe(401);
    expect((await conRol('pendiente', 'get', '/api/caja')).status).toBe(403);
    expect((await conRol('soporte', 'get', '/api/caja')).status).toBe(200);
  });

  it('solo superadmin reabre una caja', async () => {
    await abrirJornada();
    const abierta = await conToken('post', '/api/caja/apertura').send({ baseInicial: 0 });
    await conToken('post', '/api/caja/cierre').send({ efectivoContado: 0 });

    const ruta = `/api/caja/${abierta.body.caja.id}/reapertura`;
    expect((await conRol('administrador', 'post', ruta)).status).toBe(403);
    const reabierta = await conRol('superadmin', 'post', ruta);
    expect(reabierta.status).toBe(200);
    expect(reabierta.body.caja).toMatchObject({ estado: 'abierta', efectivoEsperado: null });
  });
});

describe('POST /api/caja/apertura', () => {
  it('no abre sin jornada abierta', async () => {
    const respuesta = await conToken('post', '/api/caja/apertura').send({ baseInicial: 100000 });
    expect(respuesta.status).toBe(409);
    expect(respuesta.body.mensaje).toBe('Abre la jornada antes de abrir la caja');
  });

  it('abre una sola caja por jornada', async () => {
    await abrirJornada();
    const primera = await conToken('post', '/api/caja/apertura').send({ baseInicial: 100000 });
    expect(primera.status).toBe(201);
    expect(primera.body.caja).toMatchObject({ estado: 'abierta', baseInicial: 100000 });

    const segunda = await conToken('post', '/api/caja/apertura').send({ baseInicial: 1 });
    expect(segunda.status).toBe(409);
  });

  it('valida la base', async () => {
    await abrirJornada();
    const respuesta = await conToken('post', '/api/caja/apertura').send({ baseInicial: -1 });
    expect(respuesta.status).toBe(400);
    expect(respuesta.body.errores[0].campo).toBe('baseInicial');
  });
});

describe('Cobros, egresos y cierre', () => {
  it('cobra, registra egresos, calcula los totales en el servidor y cierra con el arqueo', async () => {
    await abrirJornada();
    const empresa = await registrarCliente({ empresa: true, credito: true });
    const efectivo = await crearOrden({ estado: 'terminada' });
    const credito = await crearOrden({ estado: 'terminada', clienteId: empresa.id });
    const enProceso = await crearOrden({ estado: 'en_proceso' });

    await conToken('post', '/api/caja/apertura').send({ baseInicial: 100000 });

    const sinTerminar = await conToken('post', '/api/caja/cobros').send({
      ordenId: enProceso.id,
      medioPago: 'efectivo',
    });
    expect(sinTerminar.status).toBe(409);
    expect(sinTerminar.body.mensaje).toBe('Solo se cobra una orden terminada');

    const corto = await conToken('post', '/api/caja/cobros').send({
      ordenId: efectivo.id,
      medioPago: 'efectivo',
      recibido: 1000,
    });
    expect(corto.status).toBe(409);

    const cobroEfectivo = await conToken('post', '/api/caja/cobros').send({
      ordenId: efectivo.id,
      medioPago: 'efectivo',
      recibido: 50000,
    });
    expect(cobroEfectivo.status).toBe(201);
    expect(cobroEfectivo.body.cobro).toMatchObject({
      valor: 20000,
      recibido: 50000,
      cambio: 30000,
    });
    expect(cobroEfectivo.body.cobro.orden).toMatchObject({ estado: 'entregada' });
    expect(cobroEfectivo.body.cobro.orden.entregadaEn).not.toBeNull();

    const sinVale = await conToken('post', '/api/caja/cobros').send({
      ordenId: credito.id,
      medioPago: 'credito',
      clienteId: empresa.id,
    });
    expect(sinVale.status).toBe(400);

    const valeDePrueba = `PR-${Date.now() % 1000000}`;
    const cobroCredito = await conToken('post', '/api/caja/cobros').send({
      ordenId: credito.id,
      medioPago: 'credito',
      clienteId: empresa.id,
      numeroVale: valeDePrueba.toLowerCase(),
    });
    expect(cobroCredito.status).toBe(201);
    expect(cobroCredito.body.cobro.orden.vale).toEqual({ numero: valeDePrueba });
    expect(cobroCredito.body.cobro.orden.empresa).toMatchObject({ id: empresa.id });

    const egreso = await conToken('post', '/api/caja/egresos').send({
      categoria: 'insumos',
      concepto: 'Microfibras',
      valor: 15000,
    });
    expect(egreso.status).toBe(201);

    const estado = await conToken('get', '/api/caja');
    expect(estado.status).toBe(200);
    expect(estado.body.totales).toMatchObject({
      cobrado: 40000,
      cobros: 2,
      ticketPromedio: 20000,
      egresos: 15000,
      efectivoEsperado: 105000,
    });
    expect(estado.body.totales.porMedio).toMatchObject({ efectivo: 20000, credito: 20000 });
    expect(estado.body.porCobrar.map((orden) => orden.id)).not.toContain(efectivo.id);
    expect(estado.body.enPatio.map((orden) => orden.id)).toContain(enProceso.id);

    const cierre = await conToken('post', '/api/caja/cierre').send({ efectivoContado: 100000 });
    expect(cierre.status).toBe(200);
    expect(cierre.body.caja).toMatchObject({
      estado: 'cerrada',
      efectivoEsperado: 105000,
      efectivoContado: 100000,
      diferencia: -5000,
    });

    const conCajaCerrada = await conToken('post', '/api/caja/egresos').send({
      categoria: 'otros',
      valor: 1000,
    });
    expect(conCajaCerrada.status).toBe(409);
  });

  it('rechaza empresa o vale en un cobro que no es a crédito', async () => {
    const respuesta = await conToken('post', '/api/caja/cobros').send({
      ordenId: 1,
      medioPago: 'nequi',
      numeroVale: 'AB-123',
    });
    expect(respuesta.status).toBe(400);
  });

  it('rechaza lo recibido en un cobro que no es en efectivo', async () => {
    const respuesta = await conToken('post', '/api/caja/cobros').send({
      ordenId: 1,
      medioPago: 'datafono',
      recibido: 50000,
    });
    expect(respuesta.status).toBe(400);
  });
});

describe('Caja que quedó abierta en otra jornada', () => {
  it('no deja cerrar una jornada con su caja abierta', async () => {
    await abrirJornada();
    await conToken('post', '/api/caja/apertura').send({ baseInicial: 0 });
    const { body } = await conToken('get', '/api/caja');

    const cierre = await conToken('patch', `/api/jornadas/${body.jornada.id}/estado`).send({
      estado: 'cerrada',
    });
    expect(cierre.status).toBe(409);
    expect(cierre.body.mensaje).toBe('Cierra la caja de esta jornada antes de cerrarla');

    await conToken('post', '/api/caja/cierre').send({ efectivoContado: 0 });
    const despues = await conToken('patch', `/api/jornadas/${body.jornada.id}/estado`).send({
      estado: 'cerrada',
    });
    expect(despues.status).toBe(200);
  });

  it('la muestra para cerrarla con su arqueo y así abrir la caja de hoy', async () => {
    const fechaAnterior = await abrirJornada();
    const anterior = await conToken('post', '/api/caja/apertura').send({ baseInicial: 50000 });
    // Datos de antes de esta regla: la jornada se cerró sin cerrar su caja.
    await supabase
      .from('jornadas')
      .update({ estado: 'cerrada', cerrada_en: new Date().toISOString() })
      .eq('estado', 'abierta');
    await abrirJornada();

    const estado = await conToken('get', '/api/caja');
    expect(estado.status).toBe(200);
    expect(estado.body.caja).toBeNull();
    expect(estado.body.cajaAnterior).toMatchObject({
      id: anterior.body.caja.id,
      estado: 'abierta',
      fecha: fechaAnterior,
    });
    expect(estado.body.cajaAnterior.totales).toMatchObject({ cobrado: 0, efectivoEsperado: 50000 });

    const bloqueada = await conToken('post', '/api/caja/apertura').send({ baseInicial: 0 });
    expect(bloqueada.status).toBe(409);
    expect(bloqueada.body.mensaje).toBe('Ya hay una caja abierta');

    const cierre = await conToken('post', '/api/caja/cierre').send({ efectivoContado: 50000 });
    expect(cierre.status).toBe(200);
    expect(cierre.body.caja).toMatchObject({ id: anterior.body.caja.id, estado: 'cerrada' });

    expect((await conToken('get', '/api/caja')).body.cajaAnterior).toBeNull();
    expect((await conToken('post', '/api/caja/apertura').send({ baseInicial: 0 })).status).toBe(
      201,
    );
  });
});
