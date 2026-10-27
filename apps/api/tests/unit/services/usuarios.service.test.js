const { supabase } = require('../../../src/db/supabaseCliente');
const {
  obtenerUsuarioPorEmail,
  obtenerUsuarioPorId,
  crearUsuario,
  verificarCredenciales,
  asignarRol,
} = require('../../../src/services/usuarios.service');
const { Conflicto, NoEncontrado } = require('../../../src/utils/errores');

jest.setTimeout(10000);

const EMAIL_DUENO = 'dueno@carwash.test';

// usuarios.service.js ya escribe en el Supabase local (SCRUM-152), no en
// un array que beforeEach pudiera vaciar: el email es único (salto
// aleatorio + contador) para no chocar ni dentro de esta corrida ni con
// filas de corridas anteriores sin un `db reset` de por medio.
const selloEmail = Math.floor(Math.random() * 1e6)
  .toString()
  .padStart(6, '0');
let contadorEmail = 0;
const emailUnico = () => {
  contadorEmail += 1;
  return `prueba.usuarios.${selloEmail}.${contadorEmail}@lavadero.com`;
};

const datosDeEjemplo = () => ({
  nombre: 'Administrador Lavadero',
  email: emailUnico(),
  password: 'ClaveSegura2026!',
});

const crearUsuarioDePrueba = (overrides = {}) =>
  crearUsuario({ ...datosDeEjemplo(), ...overrides });

/**
 * La invariante "no puede quedar el sistema sin ningún superadmin activo"
 * es GLOBAL: el seed.sql siempre deja un superadmin permanente (dueño),
 * así que para probar el camino de RECHAZO hay que neutralizarlo (y a
 * cualquier otro superadmin activo que haya quedado de otra prueba)
 * durante la prueba — nunca para siempre: se restaura en el finally pase
 * lo que pase, porque otras pruebas (de este archivo y de los de
 * integración, vía TOKEN_SUPERADMIN) dependen de que siga siendo
 * superadmin activo.
 *
 * @param {number} idAExcluir el usuario cuya degradación se va a probar
 * @param {() => Promise<void>} fn
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

describe('usuarios.service', () => {
  describe('crearUsuario', () => {
    it('crea el usuario y le asigna un id', async () => {
      const usuario = await crearUsuario(datosDeEjemplo());
      expect(typeof usuario.id).toBe('number');
    });

    it('asigna un id distinto a cada usuario nuevo', async () => {
      const primero = await crearUsuario(datosDeEjemplo());
      const segundo = await crearUsuario(datosDeEjemplo());
      expect(segundo.id).not.toBe(primero.id);
    });

    it('normaliza el email a minúsculas', async () => {
      const email = emailUnico();
      const usuario = await crearUsuario({ ...datosDeEjemplo(), email: email.toUpperCase() });
      expect(usuario.email).toBe(email);
    });

    it('siempre crea el usuario como activo', async () => {
      const usuario = await crearUsuario(datosDeEjemplo());
      expect(usuario.activo).toBe(true);
    });

    it('siempre crea el usuario con rol "pendiente", sin importar qué rol venga en datos', async () => {
      const usuario = await crearUsuario({ ...datosDeEjemplo(), rol: 'superadmin' });
      expect(usuario.rol).toBe('pendiente');
    });

    it('ignora por completo cualquier intento de escalada de privilegios', async () => {
      const usuario = await crearUsuario({
        ...datosDeEjemplo(),
        rol: 'administrador',
        activo: false,
        esSuperAdmin: true,
        passwordHash: 'HASH_FALSO',
      });

      expect(usuario.rol).toBe('pendiente');
      expect(usuario.activo).toBe(true);
      expect(usuario.esSuperAdmin).toBeUndefined();
    });

    it('nunca devuelve passwordHash', async () => {
      const usuario = await crearUsuario(datosDeEjemplo());
      expect(usuario.passwordHash).toBeUndefined();
    });

    it('nunca devuelve la contraseña original', async () => {
      const datos = datosDeEjemplo();
      const usuario = await crearUsuario(datos);
      expect(JSON.stringify(usuario)).not.toContain(datos.password);
    });

    it('rechaza un email duplicado (409 Conflicto)', async () => {
      const datos = datosDeEjemplo();
      await crearUsuario(datos);
      await expect(crearUsuario(datos)).rejects.toThrow(Conflicto);
    });

    it('dos usuarios con la misma contraseña terminan con hashes distintos', async () => {
      const primero = await crearUsuario(datosDeEjemplo());
      const segundo = await crearUsuario(datosDeEjemplo());

      const { data } = await supabase
        .from('usuarios')
        .select('id, password_hash')
        .in('id', [primero.id, segundo.id]);

      const hashDe = (id) => data.find((fila) => fila.id === id).password_hash;
      expect(hashDe(primero.id)).not.toBe(hashDe(segundo.id));
    });
  });

  describe('obtenerUsuarioPorEmail', () => {
    it('encuentra al usuario sin importar mayúsculas/minúsculas', async () => {
      const datos = datosDeEjemplo();
      const creado = await crearUsuario(datos);
      await expect(obtenerUsuarioPorEmail(datos.email.toUpperCase())).resolves.toMatchObject({
        id: creado.id,
      });
    });

    it('devuelve null si no existe', async () => {
      await expect(obtenerUsuarioPorEmail('nadie@lavadero.com')).resolves.toBeNull();
    });

    it('nunca devuelve passwordHash', async () => {
      const datos = datosDeEjemplo();
      await crearUsuario(datos);
      const usuario = await obtenerUsuarioPorEmail(datos.email);
      expect(usuario.passwordHash).toBeUndefined();
    });
  });

  describe('obtenerUsuarioPorId', () => {
    it('encuentra al usuario por su id', async () => {
      const datos = datosDeEjemplo();
      const creado = await crearUsuario(datos);
      await expect(obtenerUsuarioPorId(creado.id)).resolves.toMatchObject({ email: datos.email });
    });

    it('devuelve null si el id no existe', async () => {
      await expect(obtenerUsuarioPorId(999999999)).resolves.toBeNull();
    });
  });

  describe('verificarCredenciales', () => {
    it('devuelve el usuario con la contraseña correcta', async () => {
      const datos = datosDeEjemplo();
      await crearUsuario(datos);
      const usuario = await verificarCredenciales(datos.email, datos.password);
      expect(usuario).toMatchObject({ email: datos.email });
    });

    it('devuelve null con la contraseña incorrecta', async () => {
      const datos = datosDeEjemplo();
      await crearUsuario(datos);
      expect(await verificarCredenciales(datos.email, 'OtraClave123!')).toBeNull();
    });

    it('devuelve null si el email no existe', async () => {
      expect(await verificarCredenciales('nadie@lavadero.com', 'cualquiera')).toBeNull();
    });

    it('nunca devuelve passwordHash', async () => {
      const datos = datosDeEjemplo();
      await crearUsuario(datos);
      const usuario = await verificarCredenciales(datos.email, datos.password);
      expect(usuario.passwordHash).toBeUndefined();
    });
  });

  describe('asignarRol', () => {
    it('cambia el rol de un usuario existente', async () => {
      const creado = await crearUsuarioDePrueba();
      const actualizado = await asignarRol(creado.id, 'administrador', creado.id);
      expect(actualizado.rol).toBe('administrador');
    });

    it('el cambio queda reflejado al volver a consultar al usuario', async () => {
      const creado = await crearUsuarioDePrueba();
      await asignarRol(creado.id, 'soporte', creado.id);
      await expect(obtenerUsuarioPorId(creado.id)).resolves.toMatchObject({ rol: 'soporte' });
    });

    it('lanza NoEncontrado si el id no existe', async () => {
      await expect(asignarRol(999999999, 'administrador', 1)).rejects.toThrow(NoEncontrado);
    });

    it('nunca devuelve passwordHash', async () => {
      const creado = await crearUsuarioDePrueba();
      const actualizado = await asignarRol(creado.id, 'soporte', creado.id);
      expect(actualizado.passwordHash).toBeUndefined();
    });

    describe('no puede quedar el sistema sin ningún superadmin activo (hallazgo de revisión del PR #7)', () => {
      it('rechaza degradar al único superadmin activo (409 Conflicto)', async () => {
        const dueno = await obtenerUsuarioPorEmail(EMAIL_DUENO);

        await sinOtrosSuperadminActivos(dueno.id, async () => {
          await expect(asignarRol(dueno.id, 'administrador', dueno.id)).rejects.toThrow(Conflicto);
          await expect(obtenerUsuarioPorId(dueno.id)).resolves.toMatchObject({
            rol: 'superadmin',
          });
        });
      });

      it('rechaza si el único otro superadmin activo está inactivo (inactivo no cuenta)', async () => {
        const dueno = await obtenerUsuarioPorEmail(EMAIL_DUENO);
        const otro = await crearUsuarioDePrueba();
        await asignarRol(otro.id, 'superadmin', dueno.id);
        await supabase.from('usuarios').update({ activo: false }).eq('id', otro.id);

        await sinOtrosSuperadminActivos(dueno.id, async () => {
          await expect(asignarRol(dueno.id, 'administrador', dueno.id)).rejects.toThrow(Conflicto);
        });
      });

      it('permite degradar a un superadmin si queda otro superadmin activo', async () => {
        const dueno = await obtenerUsuarioPorEmail(EMAIL_DUENO);
        const usuario1 = await crearUsuarioDePrueba();
        const usuario2 = await crearUsuarioDePrueba();
        await asignarRol(usuario1.id, 'superadmin', dueno.id);
        await asignarRol(usuario2.id, 'superadmin', dueno.id);

        const degradado = await asignarRol(usuario1.id, 'administrador', dueno.id);
        expect(degradado.rol).toBe('administrador');
      });

      it('la regla no aplica al reasignar un usuario que no es superadmin', async () => {
        const creado = await crearUsuarioDePrueba();
        await asignarRol(creado.id, 'soporte', creado.id);

        await expect(asignarRol(creado.id, 'administrador', creado.id)).resolves.toMatchObject({
          rol: 'administrador',
        });
      });

      it('la regla no aplica si el rol nuevo también es superadmin', async () => {
        const dueno = await obtenerUsuarioPorEmail(EMAIL_DUENO);

        await expect(asignarRol(dueno.id, 'superadmin', dueno.id)).resolves.toMatchObject({
          rol: 'superadmin',
        });
      });
    });
  });
});
