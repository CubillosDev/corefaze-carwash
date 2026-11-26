const {
  supabase,
  conApiKey,
  conRol,
  conToken,
  cerrarJornadaYCajaAbiertas,
  abrirJornada,
  crearOrden,
  obtenerColaborador,
  fijarArchivoDelServicio,
} = require('../utils/escenarioPanel');

fijarArchivoDelServicio(__filename);

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

// La nómina oficial es la de SCRUM-161 (nomina.test.js). Aquí se prueba lo
// que el resumen agrega para el panel: servicios, producido, totales,
// descuentos del periodo y si ya se puede liquidar.
const quincenaDe = async (fecha) => {
  const { data } = await supabase.rpc('limites_quincena', { p_fecha: fecha });
  return data;
};

describe('GET /api/nomina/quincenas/resumen (lo que usa el panel)', () => {
  it('es solo de administración', async () => {
    const { inicio, fin } = await quincenaDe('2026-11-19');
    const ruta = `/api/nomina/quincenas/resumen?inicio=${inicio}&fin=${fin}`;
    expect((await conRol('soporte', 'get', ruta)).status).toBe(403);
  });

  it('agrega servicios, producido, totales y los descuentos del periodo', async () => {
    const fecha = await abrirJornada();
    await crearOrden({ estado: 'entregada' });
    const colaborador = await obtenerColaborador();
    const descuento = await conToken('post', '/api/nomina/descuentos').send({
      colaboradorId: colaborador.id,
      tipo: 'jabon',
      valor: 3000,
      fecha,
      observacion: 'Jabón de prueba',
    });
    expect(descuento.status).toBe(201);

    const { inicio, fin } = await quincenaDe(fecha);
    const respuesta = await conToken(
      'get',
      `/api/nomina/quincenas/resumen?inicio=${inicio}&fin=${fin}`,
    );
    expect(respuesta.status).toBe(200);
    const resumen = respuesta.body;
    const fila = resumen.colaboradores.find((c) => c.colaboradorId === colaborador.id);
    expect(fila.servicios).toBeGreaterThanOrEqual(1);
    expect(fila.comision).toBe(fila.producido * 0.4);
    expect(fila.descuentos.jabon).toBeGreaterThanOrEqual(3000);
    expect(fila.neto).toBe(Math.max(fila.comision - fila.descuentosTotal, 0));
    expect(resumen.totales.producido).toBe(
      resumen.colaboradores.reduce((total, c) => total + c.producido, 0),
    );
    expect(resumen.puedeLiquidar).toBe(false);
    const delPeriodo = resumen.descuentosDelPeriodo.find(
      (d) => d.id === descuento.body.descuento.id,
    );
    expect(delPeriodo.colaborador).toMatchObject({ codigo: colaborador.codigo });
  });
});
