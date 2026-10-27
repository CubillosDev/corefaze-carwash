const request = require('supertest');
const { crearApp } = require('../../src/app');
const { supabase } = require('../../src/db/supabaseCliente');
const servicios = require('../../src/data/servicios');
const ordenesLavado = require('../../src/data/ordenesLavado');
const serviciosService = require('../../src/services/servicios.service');
const colaboradoresService = require('../../src/services/colaboradores.service');
const ordenesLavadoService = require('../../src/services/ordenesLavado.service');
const jornadasService = require('../../src/services/jornadas.service');
const usuarios = require('../../src/data/usuarios');
const { generarToken } = require('../../src/utils/jwt.util');

const LLAVE = 'k'.repeat(40);

const app = crearApp({
  apiKeys: { postman: LLAVE, admin: 'a'.repeat(40), movil: 'm'.repeat(40), web: 'w'.repeat(40) },
  origenPermitido: 'http://localhost:5173',
});

// RBAC (SCRUM-139): todo el recurso exige API Key + JWT con rol autorizado.
// autenticarJWT ya no toma el rol del payload del token: vuelve a
// consultar al usuario actual (hallazgo de revisión del PR #7), así que
// cada rol de prueba necesita también su propio registro en la "tabla"
// de usuarios, re-sembrado en cada beforeEach.
const ROLES_DE_PRUEBA = ['superadmin', 'administrador', 'soporte', 'pendiente'];
const idDeRolDePrueba = (rol) => ROLES_DE_PRUEBA.indexOf(rol) + 1;
const tokenDe = (rol) =>
  generarToken({ id: idDeRolDePrueba(rol), email: `${rol}@lavadero.com`, rol });
const TOKEN_SUPERADMIN = tokenDe('superadmin');
const TOKEN_ADMINISTRADOR = tokenDe('administrador');
const TOKEN_SOPORTE = tokenDe('soporte');
const TOKEN_PENDIENTE = tokenDe('pendiente');

// jornadas.service.js ya escribe en el Supabase local (SCRUM-152): a
// diferencia del array en memoria de antes, jornadas_fecha_key es única
// POR SIEMPRE para la fecha de "hoy" (abrirJornada() siempre usa la fecha
// real del servidor, nunca una fecha de prueba). Sin limpiarla, solo la
// PRIMERA prueba de toda la sesión podría abrir la jornada de hoy; todas
// las demás (de este archivo y de cualquier otro) chocarían con
// jornadas_fecha_key. Por eso cada prueba empieza borrando la jornada de
// hoy (y sus reaperturas, que bloquean el borrado por FK) si ya existía.
const fechaDeHoyDePrueba = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());

const limpiarJornadaDeHoy = async () => {
  const { data: jornadaDeHoy } = await supabase
    .from('jornadas')
    .select('id')
    .eq('fecha', fechaDeHoyDePrueba())
    .maybeSingle();

  if (jornadaDeHoy) {
    await supabase.from('reaperturas_jornada').delete().eq('jornada_id', jornadaDeHoy.id);
    await supabase.from('jornadas').delete().eq('id', jornadaDeHoy.id);
  }
};

// idx_jornadas_una_abierta es GLOBAL (una sola jornada abierta en todo el
// sistema, sin importar su fecha): una jornada que quedó abierta en OTRO
// archivo de pruebas (con una fecha aleatoria cualquiera) bloquearía
// abrir la de hoy aquí.
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
  servicios.length = 0;
  ordenesLavado.length = 0;
  usuarios.length = 0;
  ROLES_DE_PRUEBA.forEach((rol) => {
    usuarios.push({
      id: idDeRolDePrueba(rol),
      nombre: rol,
      email: `${rol}@lavadero.com`,
      passwordHash: 'irrelevante-para-estas-pruebas',
      rol,
      activo: true,
    });
  });
  await cerrarCualquierJornadaAbierta();
  await limpiarJornadaDeHoy();
});

const conApiKey = (metodo, ruta) => request(app)[metodo](ruta).set('X-API-Key', LLAVE);

const conToken = (metodo, ruta, token = TOKEN_ADMINISTRADOR) =>
  conApiKey(metodo, ruta).set('Authorization', `Bearer ${token}`);

// clientes.service.js y vehiculos.service.js ya escriben en el Supabase
// local (SCRUM-152), no en arrays que el beforeEach pudiera vaciar: el
// documento y la placa son únicos (salto aleatorio por archivo + contador)
// para no chocar ni dentro de esta corrida, ni con otro archivo que Jest
// ejecute en paralelo, ni con filas de corridas anteriores sin un
// `db reset` de por medio.
const selloDocumentoCliente = Math.floor(Math.random() * 1e6)
  .toString()
  .padStart(6, '0');
let contadorDocumentoCliente = 0;

const registrarCliente = async () => {
  contadorDocumentoCliente += 1;
  const respuesta = await conToken('post', '/api/clientes').send({
    nombre: 'Ana María Torres',
    documento: `${selloDocumentoCliente}${String(contadorDocumentoCliente).padStart(3, '0')}`,
    tipo: 'particular',
    telefono: '3001234567',
  });
  return respuesta.body.cliente;
};

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const letraAleatoria = () => LETRAS[Math.floor(Math.random() * LETRAS.length)];
const prefijoPlaca = `${letraAleatoria()}${letraAleatoria()}${letraAleatoria()}`;
let contadorPlaca = 0;
/** Placa de carro única: 3 letras fijas por archivo + 3 dígitos del contador. */
const placaUnica = () => {
  contadorPlaca += 1;
  return `${prefijoPlaca}${String(contadorPlaca).padStart(3, '0')}`;
};
/** Placa de moto única: 3 letras fijas por archivo + 2 dígitos del contador + 1 letra fija. */
const placaMotoUnica = () => {
  contadorPlaca += 1;
  return `${prefijoPlaca}${String(contadorPlaca).padStart(2, '0')}X`;
};

describe('POST /api/vehiculos', () => {
  it('caso válido: registra un vehículo (201)', async () => {
    const cliente = await registrarCliente();
    const placa = placaUnica();

    const respuesta = await conToken('post', '/api/vehiculos').send({
      placa: placa.toLowerCase(),
      tipoVehiculo: 'automovil',
      clienteId: cliente.id,
    });

    expect(respuesta.status).toBe(201);
    // La placa se normaliza a mayúsculas
    expect(respuesta.body.vehiculo.placa).toBe(placa);
  });

  it('regla de negocio: placa de moto corresponde a tipo moto', async () => {
    const cliente = await registrarCliente();

    const respuesta = await conToken('post', '/api/vehiculos').send({
      placa: placaMotoUnica(),
      tipoVehiculo: 'moto_hasta_150cc',
      clienteId: cliente.id,
    });

    expect(respuesta.status).toBe(201);
  });

  it('regla de negocio: rechaza placa de moto para un tipo automovil (400)', async () => {
    const cliente = await registrarCliente();

    const respuesta = await conToken('post', '/api/vehiculos').send({
      placa: 'ABC12D',
      tipoVehiculo: 'automovil',
      clienteId: cliente.id,
    });

    expect(respuesta.status).toBe(400);
  });

  it('caso inválido: placa con formato incorrecto (400)', async () => {
    const cliente = await registrarCliente();

    const respuesta = await conToken('post', '/api/vehiculos').send({
      placa: '12-ABC',
      tipoVehiculo: 'automovil',
      clienteId: cliente.id,
    });

    expect(respuesta.status).toBe(400);
  });

  it('cliente inexistente: 404', async () => {
    const respuesta = await conToken('post', '/api/vehiculos').send({
      placa: placaUnica(),
      tipoVehiculo: 'automovil',
      clienteId: 999999999,
    });

    expect(respuesta.status).toBe(404);
  });

  it('duplicado: una placa repetida responde 409', async () => {
    const cliente = await registrarCliente();
    const placa = placaUnica();

    await conToken('post', '/api/vehiculos').send({
      placa,
      tipoVehiculo: 'automovil',
      clienteId: cliente.id,
    });

    const respuesta = await conToken('post', '/api/vehiculos').send({
      placa,
      tipoVehiculo: 'automovil',
      clienteId: cliente.id,
    });

    expect(respuesta.status).toBe(409);
  });

  it('mass assignment: id enviado por el cliente se ignora', async () => {
    const cliente = await registrarCliente();

    const respuesta = await conToken('post', '/api/vehiculos').send({
      placa: placaUnica(),
      tipoVehiculo: 'automovil',
      clienteId: cliente.id,
      id: 9999,
    });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.vehiculo.id).not.toBe(9999);
  });

  it('requiere API Key', async () => {
    const respuesta = await request(app)
      .post('/api/vehiculos')
      .set('Authorization', `Bearer ${TOKEN_ADMINISTRADOR}`)
      .send({});
    expect(respuesta.status).toBe(401);
  });

  it('requiere JWT (401 sin Authorization, aunque la API Key sea válida)', async () => {
    const respuesta = await conApiKey('post', '/api/vehiculos').send({});
    expect(respuesta.status).toBe(401);
  });

  it('un superadmin también puede crear (201)', async () => {
    const cliente = await registrarCliente();

    const respuesta = await conToken('post', '/api/vehiculos', TOKEN_SUPERADMIN).send({
      placa: placaUnica(),
      tipoVehiculo: 'automovil',
      clienteId: cliente.id,
    });

    expect(respuesta.status).toBe(201);
  });

  it('RBAC: soporte no puede crear vehículos (403)', async () => {
    const cliente = await registrarCliente();

    const respuesta = await conToken('post', '/api/vehiculos', TOKEN_SOPORTE).send({
      placa: placaUnica(),
      tipoVehiculo: 'automovil',
      clienteId: cliente.id,
    });

    expect(respuesta.status).toBe(403);
  });

  it('RBAC: un usuario "pendiente" no puede crear vehículos (403)', async () => {
    const respuesta = await conToken('post', '/api/vehiculos', TOKEN_PENDIENTE).send({});
    expect(respuesta.status).toBe(403);
  });
});

describe('GET /api/vehiculos/:id', () => {
  it('id inexistente: 404', async () => {
    const respuesta = await conToken('get', '/api/vehiculos/999999999');
    expect(respuesta.status).toBe(404);
  });

  it('id inválido: 400', async () => {
    const respuesta = await conToken('get', '/api/vehiculos/abc');
    expect(respuesta.status).toBe(400);
  });

  it('soporte puede consultar (200/404 según exista)', async () => {
    const respuesta = await conToken('get', '/api/vehiculos/999999999', TOKEN_SOPORTE);
    expect(respuesta.status).toBe(404);
  });

  it('RBAC: un usuario "pendiente" no puede consultar (403)', async () => {
    const respuesta = await conToken('get', '/api/vehiculos/999999999', TOKEN_PENDIENTE);
    expect(respuesta.status).toBe(403);
  });
});

describe('PUT /api/vehiculos/:id', () => {
  it('actualiza el color (200)', async () => {
    const cliente = await registrarCliente();
    const creado = await conToken('post', '/api/vehiculos').send({
      placa: placaUnica(),
      tipoVehiculo: 'automovil',
      clienteId: cliente.id,
    });

    const respuesta = await conToken('put', `/api/vehiculos/${creado.body.vehiculo.id}`).send({
      color: 'rojo',
    });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.vehiculo.color).toBe('rojo');
  });

  it('RBAC: soporte no puede actualizar (403)', async () => {
    const cliente = await registrarCliente();
    const creado = await conToken('post', '/api/vehiculos').send({
      placa: placaUnica(),
      tipoVehiculo: 'automovil',
      clienteId: cliente.id,
    });

    const respuesta = await conToken(
      'put',
      `/api/vehiculos/${creado.body.vehiculo.id}`,
      TOKEN_SOPORTE,
    ).send({ color: 'rojo' });

    expect(respuesta.status).toBe(403);
  });
});

describe('DELETE /api/vehiculos/:id', () => {
  it('sin relaciones: elimina correctamente (200)', async () => {
    const cliente = await registrarCliente();
    const creado = await conToken('post', '/api/vehiculos').send({
      placa: placaUnica(),
      tipoVehiculo: 'automovil',
      clienteId: cliente.id,
    });

    const respuesta = await conToken('delete', `/api/vehiculos/${creado.body.vehiculo.id}`);

    expect(respuesta.status).toBe(200);
  });

  it('id inexistente: 404', async () => {
    const respuesta = await conToken('delete', '/api/vehiculos/999999999');
    expect(respuesta.status).toBe(404);
  });

  it('RBAC: soporte no puede eliminar (403)', async () => {
    const respuesta = await conToken('delete', '/api/vehiculos/999999999', TOKEN_SOPORTE);
    expect(respuesta.status).toBe(403);
  });
});

describe('Integridad referencial: DELETE /api/clientes/:id con vehículos', () => {
  it('no se puede eliminar un cliente con vehículos asociados (409)', async () => {
    const cliente = await registrarCliente();
    await conToken('post', '/api/vehiculos').send({
      placa: placaUnica(),
      tipoVehiculo: 'automovil',
      clienteId: cliente.id,
    });

    const respuesta = await conToken('delete', `/api/clientes/${cliente.id}`);

    expect(respuesta.status).toBe(409);
    expect(respuesta.body).toEqual({
      mensaje: 'No se puede eliminar un cliente con vehículos asociados',
    });
  });

  it('sí se puede eliminar un cliente sin vehículos (200)', async () => {
    const cliente = await registrarCliente();

    const respuesta = await conToken('delete', `/api/clientes/${cliente.id}`);

    expect(respuesta.status).toBe(200);
  });
});

describe('Integridad referencial: DELETE /api/vehiculos/:id con órdenes de lavado', () => {
  it('no se puede eliminar un vehículo con órdenes de lavado asociadas (409)', async () => {
    const cliente = await registrarCliente();
    const vehiculoCreado = await conToken('post', '/api/vehiculos').send({
      placa: placaUnica(),
      tipoVehiculo: 'automovil',
      clienteId: cliente.id,
    });
    const vehiculo = vehiculoCreado.body.vehiculo;

    // La orden de prueba se crea directamente contra los services (en vez
    // de vía HTTP), que operan sobre los mismos arreglos en memoria que
    // usa la app; evita repetir aquí todo el setup de los otros recursos.
    await jornadasService.abrirJornada(1);
    const servicio = await serviciosService.crearServicio(
      {
        numero: 1000 + Math.floor(Math.random() * 20000),
        nombre: 'Lavado básico',
        descripcion: 'Lavado exterior con shampoo',
        categoria: 'basico',
        tarifas: [{ tipoVehiculo: 'automovil', valor: 15000 }],
      },
      1,
    );
    // El código solo tiene 900 valores posibles (100-999): se consulta cuál
    // está libre en vez de sortear uno a ciegas, para no chocar con los que
    // ya quedaron "activos" de corridas anteriores (ver informe de la
    // Etapa B, migración de colaboradores).
    const { data: colaboradoresExistentes } = await supabase.from('colaboradores').select('codigo');
    const codigosOcupados = new Set(colaboradoresExistentes.map((fila) => fila.codigo));
    let codigoLibre = 100 + Math.floor(Math.random() * 900);
    while (codigosOcupados.has(codigoLibre)) {
      codigoLibre = 100 + ((codigoLibre - 100 + 1) % 900);
    }

    const colaborador = await colaboradoresService.crearColaborador(
      {
        codigo: codigoLibre,
        nombre: 'Juan Pérez',
        documento: `99${Date.now()}`.slice(0, 15),
        telefono: '3001234567',
        porcentajeComision: 0.15,
        tipoVinculacion: 'fijo',
      },
      1,
    );
    await ordenesLavadoService.crearOrden({
      turno: 1,
      vehiculoId: vehiculo.id,
      servicioId: servicio.id,
      colaboradorId: colaborador.id,
      medioPago: 'efectivo',
    });

    const respuesta = await conToken('delete', `/api/vehiculos/${vehiculo.id}`);

    expect(respuesta.status).toBe(409);
    expect(respuesta.body).toEqual({
      mensaje: 'No se puede eliminar un vehículo con órdenes de lavado asociadas',
    });
  });
});
