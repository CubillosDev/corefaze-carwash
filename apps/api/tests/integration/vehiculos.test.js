const request = require('supertest');
const { crearApp } = require('../../src/app');
const clientes = require('../../src/data/clientes');
const vehiculos = require('../../src/data/vehiculos');

const LLAVE = 'k'.repeat(40);

const app = crearApp({
  apiKeys: { postman: LLAVE, admin: 'a'.repeat(40), movil: 'm'.repeat(40) },
  origenPermitido: 'http://localhost:5173',
});

beforeEach(() => {
  clientes.length = 0;
  vehiculos.length = 0;
});

const conApiKey = (metodo, ruta) => request(app)[metodo](ruta).set('X-API-Key', LLAVE);

const registrarCliente = async () => {
  const respuesta = await conApiKey('post', '/api/clientes').send({
    nombre: 'Ana María Torres',
    documento: '1010101010',
    tipo: 'particular',
    telefono: '3001234567',
  });
  return respuesta.body.cliente;
};

describe('POST /api/vehiculos', () => {
  it('caso válido: registra un vehículo (201)', async () => {
    const cliente = await registrarCliente();

    const respuesta = await conApiKey('post', '/api/vehiculos').send({
      placa: 'abc123',
      tipo: 'automovil',
      clienteId: cliente.id,
    });

    expect(respuesta.status).toBe(201);
    // La placa se normaliza a mayúsculas
    expect(respuesta.body.vehiculo.placa).toBe('ABC123');
  });

  it('regla de negocio: placa de moto corresponde a tipo moto', async () => {
    const cliente = await registrarCliente();

    const respuesta = await conApiKey('post', '/api/vehiculos').send({
      placa: 'ABC12D',
      tipo: 'moto_hasta_150cc',
      clienteId: cliente.id,
    });

    expect(respuesta.status).toBe(201);
  });

  it('regla de negocio: rechaza placa de moto para un tipo automovil (400)', async () => {
    const cliente = await registrarCliente();

    const respuesta = await conApiKey('post', '/api/vehiculos').send({
      placa: 'ABC12D',
      tipo: 'automovil',
      clienteId: cliente.id,
    });

    expect(respuesta.status).toBe(400);
  });

  it('caso inválido: placa con formato incorrecto (400)', async () => {
    const cliente = await registrarCliente();

    const respuesta = await conApiKey('post', '/api/vehiculos').send({
      placa: '12-ABC',
      tipo: 'automovil',
      clienteId: cliente.id,
    });

    expect(respuesta.status).toBe(400);
  });

  it('cliente inexistente: 404', async () => {
    const respuesta = await conApiKey('post', '/api/vehiculos').send({
      placa: 'ABC123',
      tipo: 'automovil',
      clienteId: 9999,
    });

    expect(respuesta.status).toBe(404);
  });

  it('duplicado: una placa repetida responde 409', async () => {
    const cliente = await registrarCliente();
    await conApiKey('post', '/api/vehiculos').send({
      placa: 'ABC123',
      tipo: 'automovil',
      clienteId: cliente.id,
    });

    const respuesta = await conApiKey('post', '/api/vehiculos').send({
      placa: 'ABC123',
      tipo: 'automovil',
      clienteId: cliente.id,
    });

    expect(respuesta.status).toBe(409);
  });

  it('mass assignment: id enviado por el cliente se ignora', async () => {
    const cliente = await registrarCliente();

    const respuesta = await conApiKey('post', '/api/vehiculos').send({
      placa: 'ABC123',
      tipo: 'automovil',
      clienteId: cliente.id,
      id: 9999,
    });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.vehiculo.id).not.toBe(9999);
  });

  it('requiere API Key', async () => {
    const respuesta = await request(app).post('/api/vehiculos').send({});
    expect(respuesta.status).toBe(401);
  });
});

describe('GET /api/vehiculos/:id', () => {
  it('id inexistente: 404', async () => {
    const respuesta = await conApiKey('get', '/api/vehiculos/9999');
    expect(respuesta.status).toBe(404);
  });

  it('id inválido: 400', async () => {
    const respuesta = await conApiKey('get', '/api/vehiculos/abc');
    expect(respuesta.status).toBe(400);
  });
});

describe('PUT /api/vehiculos/:id', () => {
  it('actualiza el color (200)', async () => {
    const cliente = await registrarCliente();
    const creado = await conApiKey('post', '/api/vehiculos').send({
      placa: 'ABC123',
      tipo: 'automovil',
      clienteId: cliente.id,
    });

    const respuesta = await conApiKey('put', `/api/vehiculos/${creado.body.vehiculo.id}`).send({
      color: 'rojo',
    });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.vehiculo.color).toBe('rojo');
  });
});

describe('DELETE /api/vehiculos/:id', () => {
  it('sin relaciones: elimina correctamente (200)', async () => {
    const cliente = await registrarCliente();
    const creado = await conApiKey('post', '/api/vehiculos').send({
      placa: 'ABC123',
      tipo: 'automovil',
      clienteId: cliente.id,
    });

    const respuesta = await conApiKey('delete', `/api/vehiculos/${creado.body.vehiculo.id}`);

    expect(respuesta.status).toBe(200);
  });

  it('id inexistente: 404', async () => {
    const respuesta = await conApiKey('delete', '/api/vehiculos/9999');
    expect(respuesta.status).toBe(404);
  });
});

describe('Integridad referencial: DELETE /api/clientes/:id con vehículos', () => {
  it('no se puede eliminar un cliente con vehículos asociados (409)', async () => {
    const cliente = await registrarCliente();
    await conApiKey('post', '/api/vehiculos').send({
      placa: 'ABC123',
      tipo: 'automovil',
      clienteId: cliente.id,
    });

    const respuesta = await conApiKey('delete', `/api/clientes/${cliente.id}`);

    expect(respuesta.status).toBe(409);
    expect(respuesta.body).toEqual({
      mensaje: 'No se puede eliminar un cliente con vehículos asociados',
    });
  });

  it('sí se puede eliminar un cliente sin vehículos (200)', async () => {
    const cliente = await registrarCliente();

    const respuesta = await conApiKey('delete', `/api/clientes/${cliente.id}`);

    expect(respuesta.status).toBe(200);
  });
});
