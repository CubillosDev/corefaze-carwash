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
};

describe('POST /api/auth/registro', () => {
  it('registra un usuario válido (201), con rol "pendiente" asignado por el servidor', async () => {
    const respuesta = await conApiKey('post', '/api/auth/registro').send(datosDeRegistro);

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.usuario).toMatchObject({
      nombre: datosDeRegistro.nombre,
      email: datosDeRegistro.email,
      rol: 'pendiente',
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

  it('bloquea escalada de privilegios y mass assignment (Parte 10-12 del laboratorio)', async () => {
    const respuesta = await conApiKey('post', '/api/auth/registro').send({
      nombre: 'Usuario Ataque',
      email: 'ataque@lavadero.com',
      password: 'ClaveSegura2026!',
      rol: 'administrador',
      activo: false,
      id: 9999,
      esSuperAdmin: true,
      passwordHash: 'HASH_CONTROLADO',
      permisos: ['DELETE_ALL', 'ADMIN'],
    });

    expect(respuesta.status).toBe(201);
    // ATACANTE SOLICITÓ → SERVIDOR GUARDÓ
    expect(respuesta.body.usuario.rol).toBe('pendiente'); // administrador → pendiente
    expect(respuesta.body.usuario.activo).toBe(true); // false → true
    expect(respuesta.body.usuario.esSuperAdmin).toBeUndefined(); // ni siquiera existe
    expect(respuesta.body.usuario.passwordHash).toBeUndefined();
    expect(respuesta.body.usuario.permisos).toBeUndefined();
    expect(respuesta.body.usuario.id).not.toBe(9999);
  });

  it('un rol inválido para el dominio (ej. "medico") tampoco causa 400: se ignora igual', async () => {
    const respuesta = await conApiKey('post', '/api/auth/registro').send({
      ...datosDeRegistro,
      email: 'otro@lavadero.com',
      rol: 'medico',
    });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.usuario.rol).toBe('pendiente');
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
  it('un usuario recién registrado (pendiente) puede loguearse: login no depende del rol', async () => {
    await conApiKey('post', '/api/auth/registro').send(datosDeRegistro);

    const respuesta = await conApiKey('post', '/api/auth/login').send({
      email: datosDeRegistro.email,
      password: datosDeRegistro.password,
    });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.usuario.rol).toBe('pendiente');
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
  const { generarToken } = require('../../src/utils/jwt.util');

  const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  describe('GET /api/auth/perfil', () => {
    it('requiere API Key (401 sin ella, aunque el JWT sea válido)', async () => {
      const token = generarToken({ id: 1, email: 'x@x.com', rol: 'pendiente' });
      const respuesta = await request(app)
        .get('/api/auth/perfil')
        .set('Authorization', `Bearer ${token}`);

      expect(respuesta.status).toBe(401);
    });

    it('con API Key pero sin JWT: 401 "Token de autenticación requerido"', async () => {
      const respuesta = await conApiKey('get', '/api/auth/perfil');

      expect(respuesta.status).toBe(401);
      expect(respuesta.body).toEqual({ mensaje: 'Token de autenticación requerido' });
    });

    it('con API Key y JWT válido: 200, muestra usuario y clienteApi', async () => {
      await conApiKey('post', '/api/auth/registro').send(datosDeRegistro);
      const login = await conApiKey('post', '/api/auth/login').send({
        email: datosDeRegistro.email,
        password: datosDeRegistro.password,
      });

      const respuesta = await conApiKey('get', '/api/auth/perfil').set(
        'Authorization',
        `Bearer ${login.body.token}`,
      );

      expect(respuesta.status).toBe(200);
      expect(respuesta.body.usuario).toMatchObject({
        email: datosDeRegistro.email,
        rol: 'pendiente',
      });
      expect(respuesta.body.clienteApi).toEqual({ id: 1, nombre: 'Postman / Laboratorio' });
    });

    it('con un JWT alterado: 401 "Token inválido"', async () => {
      const token = generarToken({ id: 1, email: 'x@x.com', rol: 'pendiente' });
      const tokenAlterado = `${token.slice(0, -1)}x`;

      const respuesta = await conApiKey('get', '/api/auth/perfil').set(
        'Authorization',
        `Bearer ${tokenAlterado}`,
      );

      expect(respuesta.status).toBe(401);
      expect(respuesta.body).toEqual({ mensaje: 'Token inválido' });
    });

    it('con un JWT expirado: 401 "Token expirado"', async () => {
      const token = generarToken(
        { id: 1, email: 'x@x.com', rol: 'pendiente' },
        { expiresIn: '1ms' },
      );
      await esperar(50);

      const respuesta = await conApiKey('get', '/api/auth/perfil').set(
        'Authorization',
        `Bearer ${token}`,
      );

      expect(respuesta.status).toBe(401);
      expect(respuesta.body).toEqual({ mensaje: 'Token expirado' });
    });
  });
});
