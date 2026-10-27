const request = require('supertest');
const { crearApp } = require('../../src/app');
const { supabase } = require('../../src/db/supabaseCliente');
const { generarToken } = require('../../src/utils/jwt.util');

const LLAVE = 'k'.repeat(40);

const app = crearApp({
  apiKeys: { postman: LLAVE, admin: 'a'.repeat(40), movil: 'm'.repeat(40), web: 'w'.repeat(40) },
  origenPermitido: 'http://localhost:5173',
});

// bcrypt es deliberadamente lento (ver usuarios.service.test.js): cada
// registro/login real de este archivo pasa por un hash o una
// verificación completa, por encima del límite de 5000 ms por defecto.
jest.setTimeout(10000);

const conApiKey = (metodo, ruta) => request(app)[metodo](ruta).set('X-API-Key', LLAVE);

// usuarios.service.js ya escribe en el Supabase local (SCRUM-152): el
// email es único para siempre (usuarios_email_key), no en un array que
// un beforeEach pudiera vaciar. Cada prueba (y cada registro dentro de
// una misma prueba) necesita el suyo.
const selloEmail = Math.floor(Math.random() * 1e6)
  .toString()
  .padStart(6, '0');
let contadorEmail = 0;
const emailUnico = () => {
  contadorEmail += 1;
  return `prueba.auth.${selloEmail}.${contadorEmail}@lavadero.com`;
};

const datosDeRegistro = () => ({
  nombre: 'Administrador Lavadero',
  email: emailUnico(),
  password: 'ClaveSegura2026!',
});

/**
 * La invariante "no puede quedar el sistema sin ningún superadmin activo"
 * es GLOBAL: el seed.sql siempre deja un superadmin permanente (dueño),
 * así que para probar el camino de RECHAZO vía HTTP hay que
 * neutralizarlo (y a cualquier otro superadmin activo que haya quedado
 * de otra prueba) durante la prueba — nunca para siempre: se restaura en
 * el finally pase lo que pase, porque TOKEN_SUPERADMIN en los demás
 * archivos de integración depende de que siga siendo superadmin activo.
 */
const sinOtrosSuperadminActivos = async (idAExcluir, fn) => {
  const { data: otros, error } = await supabase
    .from('usuarios')
    .select('id, rol, activo')
    .eq('rol', 'superadmin')
    .eq('activo', true)
    .neq('id', idAExcluir);

  if (error) {
    throw error;
  }

  for (const otro of otros) {
    await supabase.from('usuarios').update({ rol: 'administrador' }).eq('id', otro.id);
  }

  try {
    await fn();
  } finally {
    for (const otro of otros) {
      await supabase
        .from('usuarios')
        .update({ rol: otro.rol, activo: otro.activo })
        .eq('id', otro.id);
    }
  }
};

describe('POST /api/auth/registro', () => {
  it('registra un usuario válido (201), con rol "pendiente" asignado por el servidor', async () => {
    const datos = datosDeRegistro();
    const respuesta = await conApiKey('post', '/api/auth/registro').send(datos);

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.usuario).toMatchObject({
      nombre: datos.nombre,
      email: datos.email,
      rol: 'pendiente',
      activo: true,
    });
  });

  it('nunca incluye passwordHash en la respuesta', async () => {
    const datos = datosDeRegistro();
    const respuesta = await conApiKey('post', '/api/auth/registro').send(datos);

    expect(respuesta.body.usuario.passwordHash).toBeUndefined();
    expect(JSON.stringify(respuesta.body)).not.toContain(datos.password);
  });

  it('responde 409 con un correo ya registrado', async () => {
    const datos = datosDeRegistro();
    await conApiKey('post', '/api/auth/registro').send(datos);
    const respuesta = await conApiKey('post', '/api/auth/registro').send(datos);

    expect(respuesta.status).toBe(409);
    expect(respuesta.body).toEqual({
      mensaje: 'Ya existe un usuario con ese correo electrónico',
    });
  });

  it('responde 400 con una contraseña de menos de 10 caracteres', async () => {
    const respuesta = await conApiKey('post', '/api/auth/registro').send({
      ...datosDeRegistro(),
      password: 'Corta1!',
    });

    expect(respuesta.status).toBe(400);
  });

  it('bloquea escalada de privilegios y mass assignment (Parte 10-12 del laboratorio)', async () => {
    const respuesta = await conApiKey('post', '/api/auth/registro').send({
      nombre: 'Usuario Ataque',
      email: emailUnico(),
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
      ...datosDeRegistro(),
      rol: 'medico',
    });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.usuario.rol).toBe('pendiente');
  });

  it('dos usuarios con la misma contraseña terminan con hashes distintos (salt)', async () => {
    const primero = await conApiKey('post', '/api/auth/registro').send(datosDeRegistro());
    const segundo = await conApiKey('post', '/api/auth/registro').send(datosDeRegistro());

    const { data } = await supabase
      .from('usuarios')
      .select('id, password_hash')
      .in('id', [primero.body.usuario.id, segundo.body.usuario.id]);

    const hashDe = (id) => data.find((fila) => fila.id === id).password_hash;
    expect(hashDe(primero.body.usuario.id)).not.toBe(hashDe(segundo.body.usuario.id));
  });

  it('requiere API Key, igual que el resto de /api', async () => {
    const respuesta = await request(app).post('/api/auth/registro').send(datosDeRegistro());
    expect(respuesta.status).toBe(401);
  });

  it('un usuario recién registrado (pendiente) puede loguearse: login no depende del rol', async () => {
    const datos = datosDeRegistro();
    await conApiKey('post', '/api/auth/registro').send(datos);

    const respuesta = await conApiKey('post', '/api/auth/login').send({
      email: datos.email,
      password: datos.password,
    });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.usuario.rol).toBe('pendiente');
  });
});

describe('POST /api/auth/login', () => {
  let datos;
  let idRegistrado;

  beforeEach(async () => {
    datos = datosDeRegistro();
    const registro = await conApiKey('post', '/api/auth/registro').send(datos);
    idRegistrado = registro.body.usuario.id;
  });

  it('responde 200 con credenciales correctas', async () => {
    const respuesta = await conApiKey('post', '/api/auth/login').send({
      email: datos.email,
      password: datos.password,
    });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.usuario.email).toBe(datos.email);
  });

  it('responde 401 con contraseña incorrecta', async () => {
    const respuesta = await conApiKey('post', '/api/auth/login').send({
      email: datos.email,
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
    await supabase.from('usuarios').update({ activo: false }).eq('id', idRegistrado);

    const respuesta = await conApiKey('post', '/api/auth/login').send({
      email: datos.email,
      password: datos.password,
    });

    expect(respuesta.status).toBe(403);
    expect(respuesta.body).toEqual({ mensaje: 'Usuario deshabilitado' });
  });

  it('nunca incluye passwordHash en la respuesta de login', async () => {
    const respuesta = await conApiKey('post', '/api/auth/login').send({
      email: datos.email,
      password: datos.password,
    });

    expect(respuesta.body.usuario.passwordHash).toBeUndefined();
  });

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
      const login = await conApiKey('post', '/api/auth/login').send({
        email: datos.email,
        password: datos.password,
      });

      const respuesta = await conApiKey('get', '/api/auth/perfil').set(
        'Authorization',
        `Bearer ${login.body.token}`,
      );

      expect(respuesta.status).toBe(200);
      expect(respuesta.body.usuario).toMatchObject({
        email: datos.email,
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
      await new Promise((resolve) => setTimeout(resolve, 50));

      const respuesta = await conApiKey('get', '/api/auth/perfil').set(
        'Authorization',
        `Bearer ${token}`,
      );

      expect(respuesta.status).toBe(401);
      expect(respuesta.body).toEqual({ mensaje: 'Token expirado' });
    });
  });
});

describe('PATCH /api/auth/usuarios/:id/rol', () => {
  /**
   * Registra un usuario y, por fuera de la API (no hay otra forma de
   * crear directamente un superadmin/administrador: todo usuario nace
   * "pendiente"), le asigna el rol de prueba directo contra la BD.
   * @returns {Promise<{ token: string, id: number }>}
   */
  const registrarYObtenerToken = async (rol) => {
    const datos = datosDeRegistro();
    const registro = await conApiKey('post', '/api/auth/registro').send(datos);
    const { id } = registro.body.usuario;

    const { error } = await supabase.from('usuarios').update({ rol }).eq('id', id);
    if (error) {
      throw error;
    }

    const login = await conApiKey('post', '/api/auth/login').send({
      email: datos.email,
      password: datos.password,
    });
    return { token: login.body.token, id };
  };

  it('superadmin asigna un rol a un usuario "pendiente" (200)', async () => {
    const { token: tokenSuperAdmin } = await registrarYObtenerToken('superadmin');
    const nuevo = await conApiKey('post', '/api/auth/registro').send(datosDeRegistro());

    const respuesta = await conApiKey('patch', `/api/auth/usuarios/${nuevo.body.usuario.id}/rol`)
      .set('Authorization', `Bearer ${tokenSuperAdmin}`)
      .send({ rol: 'administrador' });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.usuario.rol).toBe('administrador');
  });

  it('un rol fuera del catálogo del dominio responde 400', async () => {
    const { token: tokenSuperAdmin } = await registrarYObtenerToken('superadmin');

    const respuesta = await conApiKey('patch', '/api/auth/usuarios/1/rol')
      .set('Authorization', `Bearer ${tokenSuperAdmin}`)
      .send({ rol: 'medico' });

    expect(respuesta.status).toBe(400);
  });

  it('un usuario inexistente responde 404', async () => {
    const { token: tokenSuperAdmin } = await registrarYObtenerToken('superadmin');

    const respuesta = await conApiKey('patch', '/api/auth/usuarios/999999999/rol')
      .set('Authorization', `Bearer ${tokenSuperAdmin}`)
      .send({ rol: 'administrador' });

    expect(respuesta.status).toBe(404);
  });

  it('un administrador (no superadmin) no puede asignar roles (403)', async () => {
    const { token: tokenAdministrador } = await registrarYObtenerToken('administrador');

    const respuesta = await conApiKey('patch', '/api/auth/usuarios/1/rol')
      .set('Authorization', `Bearer ${tokenAdministrador}`)
      .send({ rol: 'soporte' });

    expect(respuesta.status).toBe(403);
  });

  it('sin JWT responde 401', async () => {
    const respuesta = await conApiKey('patch', '/api/auth/usuarios/1/rol').send({
      rol: 'administrador',
    });

    expect(respuesta.status).toBe(401);
  });

  describe('el rol se revoca de inmediato, sin esperar a que el token expire (hallazgo de revisión del PR #7)', () => {
    it('un token viejo responde según el rol NUEVO tras una reasignación, no el rol con el que se emitió', async () => {
      const { token: tokenSuperAdmin } = await registrarYObtenerToken('superadmin');

      const datosACambiar = datosDeRegistro();
      await conApiKey('post', '/api/auth/registro').send(datosACambiar);
      const loginOriginal = await conApiKey('post', '/api/auth/login').send({
        email: datosACambiar.email,
        password: datosACambiar.password,
      });
      const tokenViejo = loginOriginal.body.token;
      const idACambiar = loginOriginal.body.usuario.id;

      // Antes de la reasignación: el token viejo todavía ve su rol original.
      const perfilAntes = await conApiKey('get', '/api/auth/perfil').set(
        'Authorization',
        `Bearer ${tokenViejo}`,
      );
      expect(perfilAntes.body.usuario.rol).toBe('pendiente');

      await conApiKey('patch', `/api/auth/usuarios/${idACambiar}/rol`)
        .set('Authorization', `Bearer ${tokenSuperAdmin}`)
        .send({ rol: 'administrador' });

      // Mismo token viejo, misma firma, sin reloguear: ya refleja el rol nuevo.
      const perfilDespues = await conApiKey('get', '/api/auth/perfil').set(
        'Authorization',
        `Bearer ${tokenViejo}`,
      );
      expect(perfilDespues.body.usuario.rol).toBe('administrador');
    });
  });

  describe('no puede quedar el sistema sin ningún superadmin activo (hallazgo de revisión del PR #7)', () => {
    it('rechaza degradar al único superadmin activo (409)', async () => {
      const { token: tokenSuperAdmin, id } = await registrarYObtenerToken('superadmin');

      await sinOtrosSuperadminActivos(id, async () => {
        const respuesta = await conApiKey('patch', `/api/auth/usuarios/${id}/rol`)
          .set('Authorization', `Bearer ${tokenSuperAdmin}`)
          .send({ rol: 'administrador' });

        expect(respuesta.status).toBe(409);
      });
    });

    it('permite degradar a un superadmin si queda otro superadmin activo (200)', async () => {
      const { token: tokenSuperAdmin, id: idPrimero } = await registrarYObtenerToken('superadmin');
      await registrarYObtenerToken('superadmin');

      const respuesta = await conApiKey('patch', `/api/auth/usuarios/${idPrimero}/rol`)
        .set('Authorization', `Bearer ${tokenSuperAdmin}`)
        .send({ rol: 'administrador' });

      expect(respuesta.status).toBe(200);
      expect(respuesta.body.usuario.rol).toBe('administrador');
    });
  });
});
