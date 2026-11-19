const {
  conRol,
  conToken,
  cerrarJornadaYCajaAbiertas,
  abrirJornada,
  registrarCliente,
  crearOrden,
} = require('../utils/escenarioPanel');

beforeEach(async () => {
  await cerrarJornadaYCajaAbiertas();
});

const numeroVale = () => `VC-${Math.floor(Math.random() * 1e9)}`;

/** Una orden a crédito de la empresa, cobrada en caja con su vale. */
const ordenCobradaACredito = async (empresa) => {
  const orden = await crearOrden({ estado: 'terminada', clienteId: empresa.id });
  const numero = numeroVale();
  const cobro = await conToken('post', '/api/caja/cobros').send({
    ordenId: orden.id,
    medioPago: 'credito',
    clienteId: empresa.id,
    numeroVale: numero,
  });
  expect(cobro.status).toBe(201);
  return { orden, numero };
};

describe('PATCH /api/credito/clientes/:id/condiciones', () => {
  it('guarda cupo, corte y contacto de una empresa y los devuelve en el listado', async () => {
    const empresa = await registrarCliente({ empresa: true, credito: true });
    const respuesta = await conToken(
      'patch',
      `/api/credito/clientes/${empresa.id}/condiciones`,
    ).send({
      cupoCredito: 3000000,
      diaCorte: 30,
      contacto: 'Marcela Ruiz',
    });
    expect(respuesta.status).toBe(200);
    expect(respuesta.body.cliente).toMatchObject({
      cupoCredito: 3000000,
      diaCorte: 30,
      contacto: 'Marcela Ruiz',
    });

    const listado = await conToken('get', '/api/credito/clientes');
    expect(listado.body.clientes.find((cliente) => cliente.id === empresa.id)).toMatchObject({
      cupoCredito: 3000000,
      diaCorte: 30,
    });
  });

  it('no aplica a un particular y es solo de administración', async () => {
    const particular = await registrarCliente();
    const ruta = `/api/credito/clientes/${particular.id}/condiciones`;
    expect((await conToken('patch', ruta).send({ cupoCredito: 1000 })).status).toBe(409);
    expect((await conRol('soporte', 'patch', ruta).send({ cupoCredito: 1000 })).status).toBe(403);
  });
});

describe('Vales de crédito', () => {
  it('verifica un vale por su número y distingue empresa, pagado e inexistente', async () => {
    await abrirJornada();
    const empresa = await registrarCliente({ empresa: true, credito: true });
    const otra = await registrarCliente({ empresa: true, credito: true });
    await conToken('post', '/api/caja/apertura').send({ baseInicial: 0 });
    const { orden, numero } = await ordenCobradaACredito(empresa);

    const pendientes = await conToken('get', `/api/credito/clientes/${empresa.id}/ordenes`);
    expect(pendientes.body.ordenes[0]).toMatchObject({
      id: orden.id,
      vale: { numero, verificadoEn: null },
    });

    const deOtra = await conToken('post', '/api/credito/vales/verificacion').send({
      clienteId: otra.id,
      numero,
    });
    expect(deOtra.body.verificacion.resultado).toBe('otra_empresa');

    const inexistente = await conToken('post', '/api/credito/vales/verificacion').send({
      clienteId: empresa.id,
      numero: 'NO-EXISTE-1',
    });
    expect(inexistente.body.verificacion.resultado).toBe('no_existe');

    const sinVerificar = await conToken('post', '/api/credito/pagos').send({
      clienteId: empresa.id,
      ordenIds: [orden.id],
      medio: 'transferencia',
    });
    expect(sinVerificar.status).toBe(409);
    expect(sinVerificar.body.mensaje).toBe('Solo se pagan órdenes con el vale verificado');

    const coincide = await conRol('soporte', 'post', '/api/credito/vales/verificacion').send({
      clienteId: empresa.id,
      numero: numero.toLowerCase(),
    });
    expect(coincide.body.verificacion.resultado).toBe('coincide');
    expect(coincide.body.verificacion.vale.verificadoEn).not.toBeNull();

    const pago = await conToken('post', '/api/credito/pagos').send({
      clienteId: empresa.id,
      ordenIds: [orden.id],
      medio: 'transferencia',
    });
    expect(pago.status).toBe(201);
    expect(pago.body.pago.detalle).toEqual({ medio: 'transferencia' });

    const pagadas = await conToken(
      'get',
      `/api/credito/clientes/${empresa.id}/ordenes?tipo=pagadas`,
    );
    expect(pagadas.body.ordenes[0]).toMatchObject({
      id: orden.id,
      pago: { detalle: { medio: 'transferencia' } },
    });

    const yaPagado = await conToken('post', '/api/credito/vales/verificacion').send({
      clienteId: empresa.id,
      numero,
    });
    expect(yaPagado.body.verificacion.resultado).toBe('pagado');

    const desmarcar = await conToken('patch', `/api/credito/vales/${orden.id}`).send({
      verificado: false,
    });
    expect(desmarcar.status).toBe(409);
  });

  it('marca y desmarca la casilla de vale recibido', async () => {
    await abrirJornada();
    const empresa = await registrarCliente({ empresa: true, credito: true });
    await conToken('post', '/api/caja/apertura').send({ baseInicial: 0 });
    const { orden } = await ordenCobradaACredito(empresa);

    const marcado = await conToken('patch', `/api/credito/vales/${orden.id}`).send({
      verificado: true,
    });
    expect(marcado.body.vale.verificadoEn).not.toBeNull();
    const desmarcado = await conToken('patch', `/api/credito/vales/${orden.id}`).send({
      verificado: false,
    });
    expect(desmarcado.body.vale.verificadoEn).toBeNull();
  });

  it('registra el vale de una orden a crédito que no lo tiene, una sola vez', async () => {
    await abrirJornada();
    const empresa = await registrarCliente({ empresa: true, credito: true });
    const orden = await crearOrden({
      estado: 'entregada',
      clienteId: empresa.id,
      medioPago: 'credito',
    });
    const numero = numeroVale();

    const registrado = await conToken('post', '/api/credito/vales').send({
      ordenId: orden.id,
      numero,
    });
    expect(registrado.status).toBe(201);
    expect(registrado.body.vale).toMatchObject({
      ordenId: orden.id,
      numero,
      clienteId: empresa.id,
    });

    const otraVez = await conToken('post', '/api/credito/vales').send({
      ordenId: orden.id,
      numero: numeroVale(),
    });
    expect(otraVez.status).toBe(409);
  });

  it('no registra vale en una orden que no es a crédito', async () => {
    await abrirJornada();
    const orden = await crearOrden({ estado: 'entregada' });
    const respuesta = await conToken('post', '/api/credito/vales').send({
      ordenId: orden.id,
      numero: numeroVale(),
    });
    expect(respuesta.status).toBe(409);
  });
});
