const {
  supabase,
  conApiKey,
  conRol,
  conToken,
  cerrarJornadaYCajaAbiertas,
  abrirJornada,
  crearOrden,
  obtenerColaborador,
} = require('../utils/escenarioPanel');

beforeEach(async () => {
  await cerrarJornadaYCajaAbiertas();
});

describe('GET /api/reportes/resumen', () => {
  it('es de administración y valida el periodo', async () => {
    expect((await conApiKey('get', '/api/reportes/resumen')).status).toBe(401);
    expect(
      (await conRol('soporte', 'get', '/api/reportes/resumen?desde=2026-11-01&hasta=2026-11-07'))
        .status,
    ).toBe(403);
    expect(
      (await conToken('get', '/api/reportes/resumen?desde=2026-11-07&hasta=2026-11-01')).status,
    ).toBe(400);
    expect(
      (await conToken('get', '/api/reportes/resumen?desde=2024-01-01&hasta=2026-01-01')).status,
    ).toBe(400);
  });

  it('suma ventas por día, servicios y colaboradores, y compara con el periodo anterior', async () => {
    const fecha = await abrirJornada();
    await crearOrden({ estado: 'terminada' });
    await crearOrden({ estado: 'entregada' });
    const cancelada = await crearOrden({ estado: 'registrada' });
    await conToken('patch', `/api/ordenes-lavado/${cancelada.id}/estado`).send({
      estado: 'cancelada',
      motivo: 'Prueba',
    });

    const respuesta = await conToken('get', `/api/reportes/resumen?desde=${fecha}&hasta=${fecha}`);
    expect(respuesta.status).toBe(200);
    const { reporte } = respuesta.body;
    expect(reporte.periodo).toMatchObject({ desde: fecha, hasta: fecha, dias: 1 });
    expect(reporte.totales).toEqual({ ingresos: 40000, servicios: 2, ticketPromedio: 20000 });
    expect(reporte.porDia).toEqual([{ fecha, servicios: 2, ingresos: 40000 }]);
    expect(reporte.anterior).toMatchObject({ ingresos: 0, servicios: 0 });
    expect(reporte.servicios[0]).toMatchObject({ servicios: 2, ingresos: 40000 });
    const colaborador = await obtenerColaborador();
    expect(
      reporte.colaboradores.find((fila) => fila.colaboradorId === colaborador.id),
    ).toMatchObject({
      servicios: 2,
      ingresos: 40000,
      comision: 16000,
    });
  });
});

describe('GET /api/reportes/ingresos-por-hora', () => {
  it('devuelve la curva del día y la de la jornada anterior', async () => {
    const fecha = await abrirJornada();
    await crearOrden({ estado: 'registrada' });
    const respuesta = await conRol(
      'soporte',
      'get',
      `/api/reportes/ingresos-por-hora?fecha=${fecha}`,
    );
    expect(respuesta.status).toBe(200);
    expect(respuesta.body.curva).toMatchObject({ fecha, total: 20000 });
    expect(respuesta.body.curva.horas).toHaveLength(1);
  });
});

describe('/api/nomina', () => {
  it('es solo de administración', async () => {
    expect((await conRol('soporte', 'get', '/api/nomina/quincena')).status).toBe(403);
  });

  it('muestra la quincena con el mismo cálculo de la liquidación y registra descuentos', async () => {
    const fecha = await abrirJornada();
    await crearOrden({ estado: 'entregada' });
    const colaborador = await obtenerColaborador();

    const inicial = await conToken('get', `/api/nomina/quincena?fecha=${fecha}`);
    expect(inicial.status).toBe(200);
    const { quincena } = inicial.body;
    expect(quincena.periodo.inicio <= fecha && fecha <= quincena.periodo.fin).toBe(true);
    const fila = quincena.colaboradores.find((c) => c.colaboradorId === colaborador.id);
    expect(fila.servicios).toBeGreaterThanOrEqual(1);
    expect(fila.comision).toBe(fila.producido * 0.4);
    expect(fila.neto).toBe(Math.max(fila.comision - fila.descuentos, 0));

    // registrar_descuento usa la fecha de hoy: se prueba con la quincena de hoy.
    const descuento = await conToken('post', '/api/nomina/descuentos').send({
      colaboradorId: colaborador.id,
      tipo: 'jabon',
      valor: 3000,
      observacion: 'Jabón de prueba',
    });
    expect(descuento.status).toBe(201);
    expect(descuento.body.descuento).toMatchObject({ tipo: 'jabon', valor: 3000 });

    const hoy = await conToken('get', '/api/nomina/quincena');
    const conJabon = hoy.body.quincena.colaboradores.find(
      (c) => c.colaboradorId === colaborador.id,
    );
    expect(conJabon.jabon).toBeGreaterThanOrEqual(3000);
    expect(hoy.body.quincena.descuentos.some((d) => d.id === descuento.body.descuento.id)).toBe(
      true,
    );
  });

  it('valida el tipo de descuento (cxc lo crea la liquidación)', async () => {
    const colaborador = await obtenerColaborador();
    const respuesta = await conToken('post', '/api/nomina/descuentos').send({
      colaboradorId: colaborador.id,
      tipo: 'cxc',
      valor: 1000,
    });
    expect(respuesta.status).toBe(400);
  });

  it('no liquida una quincena que no ha terminado', async () => {
    const respuesta = await conToken('post', '/api/nomina/liquidaciones').send({
      inicio: '2999-01-01',
      fin: '2999-01-15',
    });
    expect(respuesta.status).toBe(409);
    const { data } = await supabase
      .from('liquidaciones_nomina')
      .select('id')
      .eq('periodo_inicio', '2999-01-01');
    expect(data).toEqual([]);
  });

  it('lista las liquidaciones', async () => {
    const respuesta = await conToken('get', '/api/nomina/liquidaciones');
    expect(respuesta.status).toBe(200);
    expect(Array.isArray(respuesta.body.liquidaciones)).toBe(true);
  });
});
