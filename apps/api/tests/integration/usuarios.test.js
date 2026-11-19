const request = require('supertest');
const { crearApp } = require('../../src/app');
const { supabase } = require('../../src/db/supabaseCliente');
const { generarToken } = require('../../src/utils/jwt.util');
const { generarSello, crearGeneradorDeValorUnico } = require('../utils/valorUnico');

const LLAVE = 'k'.repeat(40);

const app = crearApp({
  apiKeys: { postman: LLAVE, admin: 'a'.repeat(40), movil: 'm'.repeat(40), web: 'w'.repeat(40) },
  origenPermitido: 'http://localhost:5173',
});

jest.setTimeout(10000);

// RBAC: autenticarJWT vuelve a consultar al usuario actual en Supabase (no
// confía en el rol del payload), así que estos ids deben ser los mismos
// (y en el mismo orden) que los 4 usuarios de supabase/seed.sql — uno por
// rol (mismo convenio que colaboradores.test.js/jornadas.test.js/etc.).
const ROLES_DE_PRUEBA = ['superadmin', 'administrador', 'soporte', 'pendiente'];
const idDeRolDePrueba = (rol) => ROLES_DE_PRUEBA.indexOf(rol) + 1;
const tokenDe = (rol) =>
  generarToken({ id: idDeRolDePrueba(rol), email: `${rol}@lavadero.com`, rol });
const TOKEN_SUPERADMIN = tokenDe('superadmin');
const TOKEN_ADMINISTRADOR = tokenDe('administrador');
const TOKEN_SOPORTE = tokenDe('soporte');
const TOKEN_PENDIENTE = tokenDe('pendiente');

const conApiKey = (metodo, ruta) => request(app)[metodo](ruta).set('X-API-Key', LLAVE);
const conToken = (metodo, ruta, token = TOKEN_SUPERADMIN) =>
  conApiKey(metodo, ruta).set('Authorization', `Bearer ${token}`);

const selloEmail = generarSello();
const emailUnico = crearGeneradorDeValorUnico(
  selloEmail,
  (sello, contador) => `prueba.usuariosapi.${sello}.${contador}@lavadero.com`,
);

/**
 * Registra un usuario público (nace "pendiente") y, por fuera de la API
 * (no hay otra forma directa), le asigna el rol/estado de prueba contra
 * la BD. Devuelve también su contraseña, para poder loguearlo.
 */
const crearUsuarioDePrueba = async ({ rol = 'pendiente', activo = true } = {}) => {
  const datos = {
    nombre: 'Usuario De Prueba Admin',
    email: emailUnico(),
    password: 'ClaveSegura2026!',
  };
  const registro = await conApiKey('post', '/api/auth/registro').send(datos);
  const { id } = registro.body.usuario;

  const { error } = await supabase.from('usuarios').update({ rol, activo }).eq('id', id);
  if (error) {
    throw error;
  }

  return { id, ...datos };
};

const obtenerTokenDe = async (usuario) => {
  const login = await conApiKey('post', '/api/auth/login').send({
    email: usuario.email,
    password: usuario.password,
  });
  return login.body.token;
};

describe('GET /api/usuarios', () => {
  it('superadmin puede listar usuarios (200)', async () => {
    const respuesta = await conToken('get', '/api/usuarios', TOKEN_SUPERADMIN);
    expect(respuesta.status).toBe(200);
    expect(Array.isArray(respuesta.body.usuarios)).toBe(true);
  });

  it('administrador puede listar usuarios (200)', async () => {
    const respuesta = await conToken('get', '/api/usuarios', TOKEN_ADMINISTRADOR);
    expect(respuesta.status).toBe(200);
  });

  it('soporte NO puede listar usuarios (403)', async () => {
    const respuesta = await conToken('get', '/api/usuarios', TOKEN_SOPORTE);
    expect(respuesta.status).toBe(403);
  });

  it('pendiente NO puede listar usuarios (403)', async () => {
    const respuesta = await conToken('get', '/api/usuarios', TOKEN_PENDIENTE);
    expect(respuesta.status).toBe(403);
  });

  it('sin JWT responde 401', async () => {
    const respuesta = await conApiKey('get', '/api/usuarios');
    expect(respuesta.status).toBe(401);
  });

  it('sin API Key responde 401', async () => {
    const respuesta = await request(app)
      .get('/api/usuarios')
      .set('Authorization', `Bearer ${TOKEN_SUPERADMIN}`);
    expect(respuesta.status).toBe(401);
  });

  it('filtra por rol=pendiente (forma simple de ver las cuentas por aprobar)', async () => {
    const creado = await crearUsuarioDePrueba({ rol: 'pendiente' });

    const respuesta = await conToken('get', `/api/usuarios?rol=pendiente&busqueda=${creado.email}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.usuarios.every((usuario) => usuario.rol === 'pendiente')).toBe(true);
    expect(respuesta.body.usuarios.map((usuario) => usuario.id)).toContain(creado.id);
  });

  it('filtra por activo=false', async () => {
    const creado = await crearUsuarioDePrueba({ activo: false });

    const respuesta = await conToken('get', `/api/usuarios?activo=false&busqueda=${creado.email}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.usuarios.every((usuario) => usuario.activo === false)).toBe(true);
    expect(respuesta.body.usuarios.map((usuario) => usuario.id)).toContain(creado.id);
  });

  it('busca por email', async () => {
    const creado = await crearUsuarioDePrueba();

    const respuesta = await conToken('get', `/api/usuarios?busqueda=${creado.email}`);

    expect(respuesta.body.usuarios.map((usuario) => usuario.id)).toContain(creado.id);
  });

  it('nunca incluye passwordHash', async () => {
    const respuesta = await conToken('get', '/api/usuarios');
    expect(JSON.stringify(respuesta.body)).not.toContain('passwordHash');
  });

  it('un rol fuera del catálogo del dominio responde 400', async () => {
    const respuesta = await conToken('get', '/api/usuarios?rol=medico');
    expect(respuesta.status).toBe(400);
  });

  it('porPagina por encima del máximo responde 400', async () => {
    const respuesta = await conToken('get', '/api/usuarios?porPagina=500');
    expect(respuesta.status).toBe(400);
  });
});

describe('GET /api/usuarios/:id', () => {
  it('superadmin puede consultar un usuario por id (200)', async () => {
    const creado = await crearUsuarioDePrueba();

    const respuesta = await conToken('get', `/api/usuarios/${creado.id}`, TOKEN_SUPERADMIN);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.usuario).toMatchObject({ id: creado.id, email: creado.email });
  });

  it('administrador puede consultar un usuario por id (200)', async () => {
    const creado = await crearUsuarioDePrueba();
    const respuesta = await conToken('get', `/api/usuarios/${creado.id}`, TOKEN_ADMINISTRADOR);
    expect(respuesta.status).toBe(200);
  });

  it('soporte NO puede consultar un usuario por id (403)', async () => {
    const creado = await crearUsuarioDePrueba();
    const respuesta = await conToken('get', `/api/usuarios/${creado.id}`, TOKEN_SOPORTE);
    expect(respuesta.status).toBe(403);
  });

  it('un id inexistente responde 404', async () => {
    const respuesta = await conToken('get', '/api/usuarios/999999999', TOKEN_SUPERADMIN);
    expect(respuesta.status).toBe(404);
  });

  it('un id inválido responde 400', async () => {
    const respuesta = await conToken('get', '/api/usuarios/no-es-un-id', TOKEN_SUPERADMIN);
    expect(respuesta.status).toBe(400);
  });

  it('sin JWT responde 401', async () => {
    const respuesta = await conApiKey('get', '/api/usuarios/1');
    expect(respuesta.status).toBe(401);
  });
});

describe('PATCH /api/usuarios/:id/estado', () => {
  it('superadmin puede desactivar a otro usuario (200)', async () => {
    const creado = await crearUsuarioDePrueba();

    const respuesta = await conToken(
      'patch',
      `/api/usuarios/${creado.id}/estado`,
      TOKEN_SUPERADMIN,
    ).send({
      activo: false,
    });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.usuario.activo).toBe(false);
  });

  it('administrador NO puede cambiar el estado de un usuario (403)', async () => {
    const creado = await crearUsuarioDePrueba();

    const respuesta = await conToken(
      'patch',
      `/api/usuarios/${creado.id}/estado`,
      TOKEN_ADMINISTRADOR,
    ).send({ activo: false });

    expect(respuesta.status).toBe(403);
  });

  it('soporte NO puede cambiar el estado de un usuario (403)', async () => {
    const creado = await crearUsuarioDePrueba();

    const respuesta = await conToken(
      'patch',
      `/api/usuarios/${creado.id}/estado`,
      TOKEN_SOPORTE,
    ).send({
      activo: false,
    });

    expect(respuesta.status).toBe(403);
  });

  it('sin JWT responde 401', async () => {
    const creado = await crearUsuarioDePrueba();
    const respuesta = await conApiKey('patch', `/api/usuarios/${creado.id}/estado`).send({
      activo: false,
    });
    expect(respuesta.status).toBe(401);
  });

  it('un activo que no es booleano responde 400', async () => {
    const creado = await crearUsuarioDePrueba();

    const respuesta = await conToken(
      'patch',
      `/api/usuarios/${creado.id}/estado`,
      TOKEN_SUPERADMIN,
    ).send({ activo: 'si' });

    expect(respuesta.status).toBe(400);
  });

  it('un id inexistente responde 404', async () => {
    const respuesta = await conToken(
      'patch',
      '/api/usuarios/999999999/estado',
      TOKEN_SUPERADMIN,
    ).send({ activo: false });

    expect(respuesta.status).toBe(404);
  });

  describe('no puede desactivarse a sí mismo (SCRUM-141)', () => {
    it('responde 409 con un mensaje claro', async () => {
      const superadmin = await crearUsuarioDePrueba({ rol: 'superadmin' });
      const tokenPropio = await obtenerTokenDe(superadmin);

      const respuesta = await conToken(
        'patch',
        `/api/usuarios/${superadmin.id}/estado`,
        tokenPropio,
      ).send({ activo: false });

      expect(respuesta.status).toBe(409);
      expect(respuesta.body.mensaje).toMatch(/desactivarte a ti mismo/i);
    });
  });

  describe('no puede quedar el sistema sin ningún superadmin activo', () => {
    // No hay una prueba de integración separada para "rechaza desactivar
    // al único superadmin activo" distinta de la de arriba ("no puede
    // desactivarse a sí mismo"): por HTTP, quien llama a este endpoint ya
    // tuvo que pasar autorizarRoles(superadmin), es decir, ya es un
    // superadmin ACTIVO — y ese mismo actor, si no es el objetivo, cuenta
    // como "otro superadmin activo" para la invariante, así que la única
    // forma de que el conteo llegue a cero por HTTP es que actor y
    // objetivo sean la MISMA persona, lo que el chequeo de
    // autodesactivación ya intercepta primero (ambos devuelven 409, por
    // razones distintas). La regla en sí (sin esa restricción de
    // autorización) está probada de forma aislada y directa en
    // usuarios.service.test.js, llamando a cambiarEstadoUsuario con un
    // actor que NO es superadmin.
    it('permite desactivar a un superadmin si queda otro superadmin activo (200)', async () => {
      const unSuperadmin = await crearUsuarioDePrueba({ rol: 'superadmin' });

      const respuesta = await conToken(
        'patch',
        `/api/usuarios/${unSuperadmin.id}/estado`,
        TOKEN_SUPERADMIN,
      ).send({ activo: false });

      expect(respuesta.status).toBe(200);
      expect(respuesta.body.usuario.activo).toBe(false);
    });
  });

  describe('un usuario desactivado deja de poder operar en la siguiente petición', () => {
    it('un token emitido antes de la desactivación responde 401 después (autenticarJWT consulta la BD)', async () => {
      const creado = await crearUsuarioDePrueba({ rol: 'soporte' });
      const tokenDelUsuario = await obtenerTokenDe(creado);

      const antes = await conToken('get', '/api/auth/perfil', tokenDelUsuario);
      expect(antes.status).toBe(200);

      await conToken('patch', `/api/usuarios/${creado.id}/estado`, TOKEN_SUPERADMIN).send({
        activo: false,
      });

      const despues = await conToken('get', '/api/auth/perfil', tokenDelUsuario);
      expect(despues.status).toBe(401);
      expect(despues.body).toEqual({ mensaje: 'Usuario deshabilitado' });
    });
  });
});
