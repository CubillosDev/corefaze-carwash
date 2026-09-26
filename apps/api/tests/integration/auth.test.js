const request = require('supertest');
const { crearApp } = require('../../src/app');
const usuarios = require('../../src/data/usuarios');

const LLAVE = 'k'.repeat(40);

const app = crearApp({
  apiKeys: { postman: LLAVE, admin: 'a'.repeat(40), movil: 'm'.repeat(40) },
  origenPermitido: 'http://localhost:5173',
});

// La tabla en memoria es un módulo compartido; se limpia antes de cada
// prueba para que ninguna arrastre usuarios de la anterior.
beforeEach(() => {
  usuarios.length = 0;
});

const conApiKey = (metodo, ruta) => request(app)[metodo](ruta).set('X-API-Key', LLAVE);

const datosDeRegistro = {
  nombre: 'Administrador Lavadero',
  email: 'admin@lavadero.com',
  password: 'ClaveSegura2026!',
  rol: 'superadmin',
};

describe('POST /api/auth/registro', () => {
  it('registra un usuario válido (201)', async () => {
    const respuesta = await conApiKey('post', '/api/auth/registro').send(datosDeRegistro);

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.usuario).toMatchObject({
      nombre: datosDeRegistro.nombre,
      email: datosDeRegistro.email,
      rol: datosDeRegistro.rol,
      activo: true,
    });
  });

  it('nunca incluye passwordHash en la respuesta', async () => {
    const respuesta = await conApiKey('post', '/api/auth/registro').send(datosDeRegistro);

    expect(respuesta.body.usuario.passwordHash).toBeUndefined();
    expect(JSON.stringify(respuesta.body)).not.toContain(datosDeRegistro.password);
  });

  it('responde 409 con un correo ya registrado', async () => {
    await conApiKey('post', '/api/auth/registro').send(datosDeRegistro);
    const respuesta = await conApiKey('post', '/api/auth/registro').send(datosDeRegistro);

    expect(respuesta.status).toBe(409);
    expect(respuesta.body).toEqual({
      mensaje: 'Ya existe un usuario con ese correo electrónico',
    });
  });

  it('responde 400 con una contraseña de menos de 10 caracteres', async () => {
    const respuesta = await conApiKey('post', '/api/auth/registro').send({
      ...datosDeRegistro,
      password: 'Corta1!',
    });

    expect(respuesta.status).toBe(400);
  });

  it('bloquea mass assignment: activo y rol falso no llegan al usuario creado', async () => {
    const respuesta = await conApiKey('post', '/api/auth/registro').send({
      ...datosDeRegistro,
      email: 'ataque@lavadero.com',
      activo: false,
      esSuperAdmin: true,
      passwordHash: 'HASH_FALSO',
    });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.usuario.activo).toBe(true);
    expect(respuesta.body.usuario.esSuperAdmin).toBeUndefined();
    expect(respuesta.body.usuario.passwordHash).toBeUndefined();
  });

  it('dos usuarios con la misma contraseña terminan con hashes distintos (salt)', async () => {
    await conApiKey('post', '/api/auth/registro').send(datosDeRegistro);
    await conApiKey('post', '/api/auth/registro').send({
      ...datosDeRegistro,
      email: 'medico@lavadero.com',
    });

    const [primero, segundo] = usuarios;
    expect(primero.passwordHash).not.toBe(segundo.passwordHash);
  });

  it('requiere API Key, igual que el resto de /api', async () => {
    const respuesta = await request(app).post('/api/auth/registro').send(datosDeRegistro);
    expect(respuesta.status).toBe(401);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await conApiKey('post', '/api/auth/registro').send(datosDeRegistro);
  });

  it('responde 200 con credenciales correctas', async () => {
    const respuesta = await conApiKey('post', '/api/auth/login').send({
      email: datosDeRegistro.email,
      password: datosDeRegistro.password,
    });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.usuario.email).toBe(datosDeRegistro.email);
  });

  it('responde 401 con contraseña incorrecta', async () => {
    const respuesta = await conApiKey('post', '/api/auth/login').send({
      email: datosDeRegistro.email,
      password: 'ContraseñaIncorrecta1!',
    });

    expect(respuesta.status).toBe(401);
    expect(respuesta.body).toEqual({ mensaje: 'Credenciales inválidas' });
  });

  it('responde 401 con un usuario inexistente, con el mismo mensaje que una contraseña incorrecta', async () => {
    const respuesta = await conApiKey('post', '/api/auth/login').send({
      email: 'nadie@lavadero.com',
      password: 'cualquier-cosa',
    });

    expect(respuesta.status).toBe(401);
    expect(respuesta.body).toEqual({ mensaje: 'Credenciales inválidas' });
  });

  it('responde 403 cuando el usuario está deshabilitado', async () => {
    usuarios[0].activo = false;

    const respuesta = await conApiKey('post', '/api/auth/login').send({
      email: datosDeRegistro.email,
      password: datosDeRegistro.password,
    });

    expect(respuesta.status).toBe(403);
    expect(respuesta.body).toEqual({ mensaje: 'Usuario deshabilitado' });
  });

  it('nunca incluye passwordHash en la respuesta de login', async () => {
    const respuesta = await conApiKey('post', '/api/auth/login').send({
      email: datosDeRegistro.email,
      password: datosDeRegistro.password,
    });

    expect(respuesta.body.usuario.passwordHash).toBeUndefined();
  });
});
