// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

import { crearHttpCliente, ErrorHttp } from '@/lib/httpCliente';

const URL_BASE = 'http://api.prueba/api/';
const LLAVE = 'llave-de-prueba';

function respuestaJson(estado, cuerpo) {
  return new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'Content-Type': 'application/json' },
  });
}

function clienteQueResponde(estado, cuerpo) {
  const hacerPeticion = vi.fn(async () => respuestaJson(estado, cuerpo));
  return { hacerPeticion, cliente: crearHttpCliente({ urlBase: URL_BASE, llaveApi: LLAVE, hacerPeticion }) };
}

/** fetch que no responde hasta que alguien aborta la señal. */
function fetchColgado() {
  return vi.fn(
    (_url, { signal }) =>
      new Promise((_resolver, rechazar) => {
        signal.addEventListener('abort', () => rechazar(signal.reason), { once: true });
      }),
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('httpCliente: solicitudes', () => {
  it('arma la URL desde la base, envía la llave en X-API-Key y devuelve el cuerpo', async () => {
    const { cliente, hacerPeticion } = clienteQueResponde(200, { servicios: [] });

    const cuerpo = await cliente.obtener('/servicios');

    expect(cuerpo).toEqual({ servicios: [] });
    expect(hacerPeticion).toHaveBeenCalledWith(
      'http://api.prueba/api/servicios',
      expect.objectContaining({
        method: 'GET',
        headers: { Accept: 'application/json', 'X-API-Key': LLAVE },
      }),
    );
  });

  it('no envía X-API-Key si no hay llave configurada', async () => {
    const hacerPeticion = vi.fn(async () => respuestaJson(200, {}));
    const cliente = crearHttpCliente({ urlBase: URL_BASE, hacerPeticion });

    await cliente.obtener('servicios');

    expect(hacerPeticion.mock.calls[0][1].headers).not.toHaveProperty('X-API-Key');
  });

  it('agrega los parámetros de consulta y omite los vacíos', async () => {
    const { cliente, hacerPeticion } = clienteQueResponde(200, { ordenes: [] });

    await cliente.obtener('ordenes-lavado', {
      consulta: { estado: 'registrada', placa: '', pagina: 2, fecha: undefined },
    });

    expect(hacerPeticion.mock.calls[0][0]).toBe(
      'http://api.prueba/api/ordenes-lavado?estado=registrada&pagina=2',
    );
  });

  it('envía los datos como JSON con su tipo de contenido', async () => {
    const { cliente, hacerPeticion } = clienteQueResponde(201, { mensaje: 'Creado' });

    await cliente.crear('clientes', { nombre: 'Cliente de prueba' });

    const [, opciones] = hacerPeticion.mock.calls[0];
    expect(opciones.method).toBe('POST');
    expect(opciones.headers['Content-Type']).toBe('application/json');
    expect(opciones.body).toBe(JSON.stringify({ nombre: 'Cliente de prueba' }));
  });

  it('usa el método de cada operación', async () => {
    const { cliente, hacerPeticion } = clienteQueResponde(200, {});

    await cliente.reemplazar('clientes/1', {});
    await cliente.actualizar('ordenes-lavado/1/estado', {});
    await cliente.eliminar('clientes/1');

    expect(hacerPeticion.mock.calls.map(([, opciones]) => opciones.method)).toEqual([
      'PUT',
      'PATCH',
      'DELETE',
    ]);
  });

  it('devuelve null cuando la respuesta no trae cuerpo', async () => {
    const hacerPeticion = vi.fn(async () => new Response(null, { status: 204 }));
    const cliente = crearHttpCliente({ urlBase: URL_BASE, hacerPeticion });

    await expect(cliente.eliminar('clientes/1')).resolves.toBeNull();
  });
});

describe('httpCliente: errores de la API', () => {
  it('en 400 conserva el mensaje del servidor y agrupa los errores por campo', async () => {
    const { cliente } = clienteQueResponde(400, {
      mensaje: 'Datos de entrada inválidos',
      errores: [
        { campo: 'placa', mensaje: 'La placa no tiene un formato válido' },
        { campo: 'telefono', mensaje: 'El teléfono debe tener 10 dígitos' },
      ],
    });

    const error = await cliente.crear('vehiculos', {}).catch((e) => e);

    expect(error).toBeInstanceOf(ErrorHttp);
    expect(error.estado).toBe(400);
    expect(error.message).toBe('Datos de entrada inválidos');
    expect(error.erroresPorCampo).toEqual({
      placa: 'La placa no tiene un formato válido',
      telefono: 'El teléfono debe tener 10 dígitos',
    });
  });

  it.each([
    [404, 'Cliente no encontrado'],
    [409, 'Ya existe un vehículo con esa placa'],
  ])('en %i muestra el mensaje de negocio que envía la API', async (estado, mensaje) => {
    const { cliente } = clienteQueResponde(estado, { mensaje });

    await expect(cliente.obtener('clientes/9')).rejects.toMatchObject({ estado, message: mensaje });
  });

  it('usa el mensaje propio cuando la API no envía uno', async () => {
    const { cliente } = clienteQueResponde(409, undefined);

    await expect(cliente.obtener('clientes')).rejects.toMatchObject({
      estado: 409,
      message: 'No se puede completar porque choca con información que ya está registrada.',
    });
  });

  it.each([
    [401, 'API Key inválida', 'No pudimos verificar tu acceso.'],
    [403, 'API Key deshabilitada', 'No tienes permiso'],
    [429, 'Too Many Requests', 'demasiadas solicitudes'],
    [500, 'Error interno del servidor', 'El servidor presentó un error.'],
    [503, 'Service Unavailable', 'El servidor presentó un error.'],
  ])('en %i reemplaza el mensaje técnico por uno para la persona', async (estado, tecnico, esperado) => {
    const { cliente } = clienteQueResponde(estado, { mensaje: tecnico });

    const error = await cliente.obtener('servicios').catch((e) => e);

    expect(error.estado).toBe(estado);
    expect(error.message).toContain(esperado);
    expect(error.message).not.toContain(tecnico);
  });

  it('no escribe en la consola la llave ni las respuestas', async () => {
    const espias = ['log', 'info', 'warn', 'error', 'debug'].map((metodo) =>
      vi.spyOn(console, metodo).mockImplementation(() => {}),
    );
    const { cliente } = clienteQueResponde(500, { mensaje: 'Error interno del servidor' });

    await cliente.obtener('servicios').catch(() => {});

    for (const espia of espias) {
      expect(espia).not.toHaveBeenCalled();
    }
  });
});

describe('httpCliente: red, tiempo y cancelación', () => {
  it('informa la falta de conexión con estado 0', async () => {
    const hacerPeticion = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    const cliente = crearHttpCliente({ urlBase: URL_BASE, hacerPeticion });

    const error = await cliente.obtener('servicios').catch((e) => e);

    expect(error).toBeInstanceOf(ErrorHttp);
    expect(error.estado).toBe(0);
    expect(error.message).toContain('No pudimos comunicarnos con el servidor');
  });

  it('corta la solicitud cuando se agota el tiempo máximo', async () => {
    const hacerPeticion = fetchColgado();
    const cliente = crearHttpCliente({ urlBase: URL_BASE, hacerPeticion, tiempoMaximoMs: 10 });

    const error = await cliente.obtener('servicios').catch((e) => e);

    expect(error).toBeInstanceOf(ErrorHttp);
    expect(error.estado).toBe(0);
    expect(error.message).toContain('tardó demasiado');
    expect(hacerPeticion.mock.calls[0][1].signal.aborted).toBe(true);
  });

  it('permite un tiempo máximo distinto por solicitud', async () => {
    const cliente = crearHttpCliente({
      urlBase: URL_BASE,
      hacerPeticion: fetchColgado(),
      tiempoMaximoMs: 60_000,
    });

    await expect(cliente.obtener('servicios', { tiempoMaximoMs: 10 })).rejects.toMatchObject({
      message: expect.stringContaining('tardó demasiado'),
    });
  });

  it('deja pasar sin traducir la cancelación de quien llama', async () => {
    const cliente = crearHttpCliente({ urlBase: URL_BASE, hacerPeticion: fetchColgado() });
    const controlador = new AbortController();

    const promesa = cliente.obtener('servicios', { signal: controlador.signal });
    controlador.abort();
    const error = await promesa.catch((e) => e);

    expect(error.name).toBe('AbortError');
    expect(error).not.toBeInstanceOf(ErrorHttp);
  });

  it('no envía la solicitud si la señal ya venía cancelada', async () => {
    const hacerPeticion = fetchColgado();
    const cliente = crearHttpCliente({ urlBase: URL_BASE, hacerPeticion });

    const error = await cliente
      .obtener('servicios', { signal: AbortSignal.abort() })
      .catch((e) => e);

    expect(error.name).toBe('AbortError');
    expect(hacerPeticion).not.toHaveBeenCalled();
  });
});

describe('httpCliente: instancia de la aplicación', () => {
  it('toma la URL base de VITE_API_URL y la llave de VITE_API_KEY', async () => {
    vi.stubEnv('VITE_API_URL', 'http://api.prueba/api');
    vi.stubEnv('VITE_API_KEY', 'llave-del-entorno');
    const fetchSimulado = vi.fn(async () => respuestaJson(200, { servicios: [] }));
    vi.stubGlobal('fetch', fetchSimulado);
    vi.resetModules();

    const { httpCliente } = await import('@/lib/httpCliente');
    await httpCliente.obtener('servicios');

    expect(fetchSimulado).toHaveBeenCalledWith(
      'http://api.prueba/api/servicios',
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-API-Key': 'llave-del-entorno' }),
      }),
    );
  });
});


describe('httpCliente: sesión', () => {
  function clienteConSesion({ token, estado = 200, cuerpo = {} }) {
    const hacerPeticion = vi.fn(async () => respuestaJson(estado, cuerpo));
    const alSesionExpirada = vi.fn();
    const cliente = crearHttpCliente({
      urlBase: URL_BASE,
      llaveApi: LLAVE,
      hacerPeticion,
      obtenerToken: () => token,
      alSesionExpirada,
    });
    return { cliente, hacerPeticion, alSesionExpirada };
  }

  it('agrega Authorization: Bearer cuando hay token', async () => {
    const { cliente, hacerPeticion } = clienteConSesion({ token: 'jwt-de-prueba' });

    await cliente.obtener('vehiculos');

    expect(hacerPeticion.mock.calls[0][1].headers).toEqual({
      Accept: 'application/json',
      'X-API-Key': LLAVE,
      Authorization: 'Bearer jwt-de-prueba',
    });
  });

  it('no envía Authorization cuando no hay sesión', async () => {
    const { cliente, hacerPeticion } = clienteConSesion({ token: null });

    await cliente.obtener('vehiculos');

    expect(hacerPeticion.mock.calls[0][1].headers).not.toHaveProperty('Authorization');
  });

  it('pide el token en cada solicitud, no una sola vez', async () => {
    let token = 'primero';
    const hacerPeticion = vi.fn(async () => respuestaJson(200, {}));
    const cliente = crearHttpCliente({
      urlBase: URL_BASE,
      hacerPeticion,
      obtenerToken: () => token,
    });

    await cliente.obtener('a');
    token = 'segundo';
    await cliente.obtener('b');

    expect(hacerPeticion.mock.calls[0][1].headers.Authorization).toBe('Bearer primero');
    expect(hacerPeticion.mock.calls[1][1].headers.Authorization).toBe('Bearer segundo');
  });

  it('avisa que la sesión expiró cuando la API responde 401 a una solicitud con token', async () => {
    const { cliente, alSesionExpirada } = clienteConSesion({
      token: 'jwt-vencido',
      estado: 401,
      cuerpo: { mensaje: 'Token expirado' },
    });

    await expect(cliente.obtener('vehiculos')).rejects.toMatchObject({ estado: 401 });
    expect(alSesionExpirada).toHaveBeenCalledTimes(1);
  });

  it('no avisa de sesión expirada ante un 401 sin token (credenciales incorrectas al ingresar)', async () => {
    const { cliente, alSesionExpirada } = clienteConSesion({
      token: null,
      estado: 401,
      cuerpo: { mensaje: 'Credenciales inválidas' },
    });

    await expect(cliente.crear('auth/login', {})).rejects.toMatchObject({ estado: 401 });
    expect(alSesionExpirada).not.toHaveBeenCalled();
  });

  it('no avisa de sesión expirada ante otros errores (403, 404, 409)', async () => {
    for (const estado of [403, 404, 409]) {
      const { cliente, alSesionExpirada } = clienteConSesion({ token: 'jwt', estado });
      await expect(cliente.obtener('x')).rejects.toBeInstanceOf(ErrorHttp);
      expect(alSesionExpirada).not.toHaveBeenCalled();
    }
  });
});
