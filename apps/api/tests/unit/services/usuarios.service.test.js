const usuarios = require('../../../src/data/usuarios');
const {
  obtenerUsuarioPorEmail,
  obtenerUsuarioPorId,
  crearUsuario,
  verificarCredenciales,
  asignarRol,
  crearSuperAdministradorInicial,
} = require('../../../src/services/usuarios.service');
const { Conflicto } = require('../../../src/utils/errores');

jest.setTimeout(10000);

// La "tabla" en memoria es un módulo compartido entre pruebas; se limpia
// antes de cada una para que no arrastren usuarios de la prueba anterior.
beforeEach(() => {
  usuarios.length = 0;
});

const datosDeEjemplo = {
  nombre: 'Administrador Lavadero',
  email: 'admin@lavadero.com',
  password: 'ClaveSegura2026!',
};

describe('usuarios.service', () => {
  describe('crearUsuario', () => {
    it('crea el usuario con id 1 cuando la tabla está vacía', async () => {
      const usuario = await crearUsuario(datosDeEjemplo);
      expect(usuario.id).toBe(1);
    });

    it('asigna ids consecutivos', async () => {
      await crearUsuario(datosDeEjemplo);
      const segundo = await crearUsuario({ ...datosDeEjemplo, email: 'otro@lavadero.com' });
      expect(segundo.id).toBe(2);
    });

    it('normaliza el email a minúsculas', async () => {
      const usuario = await crearUsuario({ ...datosDeEjemplo, email: 'ADMIN@LAVADERO.COM' });
      expect(usuario.email).toBe('admin@lavadero.com');
    });

    it('siempre crea el usuario como activo', async () => {
      const usuario = await crearUsuario(datosDeEjemplo);
      expect(usuario.activo).toBe(true);
    });

    it('siempre crea el usuario con rol "pendiente", sin importar qué rol venga en datos', async () => {
      const usuario = await crearUsuario({ ...datosDeEjemplo, rol: 'superadmin' });
      expect(usuario.rol).toBe('pendiente');
    });

    it('ignora por completo cualquier intento de escalada de privilegios', async () => {
      const usuario = await crearUsuario({
        ...datosDeEjemplo,
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
      const usuario = await crearUsuario(datosDeEjemplo);
      expect(usuario.passwordHash).toBeUndefined();
    });

    it('nunca devuelve la contraseña original', async () => {
      const usuario = await crearUsuario(datosDeEjemplo);
      expect(JSON.stringify(usuario)).not.toContain(datosDeEjemplo.password);
    });

    it('dos usuarios con la misma contraseña terminan con hashes distintos', async () => {
      await crearUsuario(datosDeEjemplo);
      await crearUsuario({ ...datosDeEjemplo, email: 'otro@lavadero.com' });

      const [primero, segundo] = usuarios;
      expect(primero.passwordHash).not.toBe(segundo.passwordHash);
    });
  });

  describe('obtenerUsuarioPorEmail', () => {
    it('encuentra al usuario sin importar mayúsculas/minúsculas', async () => {
      await crearUsuario(datosDeEjemplo);
      expect(obtenerUsuarioPorEmail('ADMIN@lavadero.com')).toMatchObject({ id: 1 });
    });

    it('devuelve null si no existe', () => {
      expect(obtenerUsuarioPorEmail('nadie@lavadero.com')).toBeNull();
    });

    it('nunca devuelve passwordHash', async () => {
      await crearUsuario(datosDeEjemplo);
      expect(obtenerUsuarioPorEmail(datosDeEjemplo.email).passwordHash).toBeUndefined();
    });
  });

  describe('obtenerUsuarioPorId', () => {
    it('encuentra al usuario por su id', async () => {
      await crearUsuario(datosDeEjemplo);
      expect(obtenerUsuarioPorId(1)).toMatchObject({ email: datosDeEjemplo.email });
    });

    it('devuelve null si el id no existe', () => {
      expect(obtenerUsuarioPorId(999)).toBeNull();
    });
  });

  describe('verificarCredenciales', () => {
    it('devuelve el usuario con la contraseña correcta', async () => {
      await crearUsuario(datosDeEjemplo);
      const usuario = await verificarCredenciales(datosDeEjemplo.email, datosDeEjemplo.password);
      expect(usuario).toMatchObject({ email: datosDeEjemplo.email });
    });

    it('devuelve null con la contraseña incorrecta', async () => {
      await crearUsuario(datosDeEjemplo);
      expect(await verificarCredenciales(datosDeEjemplo.email, 'OtraClave123!')).toBeNull();
    });

    it('devuelve null si el email no existe', async () => {
      expect(await verificarCredenciales('nadie@lavadero.com', 'cualquiera')).toBeNull();
    });

    it('nunca devuelve passwordHash', async () => {
      await crearUsuario(datosDeEjemplo);
      const usuario = await verificarCredenciales(datosDeEjemplo.email, datosDeEjemplo.password);
      expect(usuario.passwordHash).toBeUndefined();
    });
  });

  describe('asignarRol', () => {
    it('cambia el rol de un usuario existente', async () => {
      await crearUsuario(datosDeEjemplo);
      const actualizado = asignarRol(1, 'administrador');
      expect(actualizado.rol).toBe('administrador');
    });

    it('el cambio queda reflejado al volver a consultar al usuario', async () => {
      await crearUsuario(datosDeEjemplo);
      asignarRol(1, 'soporte');
      expect(obtenerUsuarioPorId(1).rol).toBe('soporte');
    });

    it('devuelve null si el id no existe', () => {
      expect(asignarRol(999, 'administrador')).toBeNull();
    });

    it('nunca devuelve passwordHash', async () => {
      await crearUsuario(datosDeEjemplo);
      expect(asignarRol(1, 'soporte').passwordHash).toBeUndefined();
    });

    describe('no puede quedar el sistema sin ningún superadmin activo (hallazgo de revisión del PR #7)', () => {
      it('rechaza degradar al único superadmin activo (409 Conflicto)', async () => {
        await crearUsuario(datosDeEjemplo);
        asignarRol(1, 'superadmin');

        expect(() => asignarRol(1, 'administrador')).toThrow(Conflicto);
        expect(obtenerUsuarioPorId(1).rol).toBe('superadmin'); // no se degradó
      });

      it('permite degradar a un superadmin si queda otro superadmin activo', async () => {
        await crearUsuario(datosDeEjemplo);
        await crearUsuario({ ...datosDeEjemplo, email: 'otro@lavadero.com' });
        asignarRol(1, 'superadmin');
        asignarRol(2, 'superadmin');

        expect(() => asignarRol(1, 'administrador')).not.toThrow();
        expect(obtenerUsuarioPorId(1).rol).toBe('administrador');
      });

      it('rechaza si el único otro superadmin está inactivo (inactivo no cuenta)', async () => {
        await crearUsuario(datosDeEjemplo);
        await crearUsuario({ ...datosDeEjemplo, email: 'otro@lavadero.com' });
        asignarRol(1, 'superadmin');
        asignarRol(2, 'superadmin');
        usuarios[1].activo = false;

        expect(() => asignarRol(1, 'administrador')).toThrow(Conflicto);
      });

      it('la regla no aplica al reasignar un usuario que no es superadmin', async () => {
        await crearUsuario(datosDeEjemplo);
        asignarRol(1, 'soporte');

        expect(() => asignarRol(1, 'administrador')).not.toThrow();
      });

      it('la regla no aplica si el rol nuevo también es superadmin', async () => {
        await crearUsuario(datosDeEjemplo);
        asignarRol(1, 'superadmin');

        expect(() => asignarRol(1, 'superadmin')).not.toThrow();
      });
    });
  });

  describe('crearSuperAdministradorInicial', () => {
    const datosSuperAdmin = {
      nombre: 'Super Administrador',
      email: 'superadmin@lavadero.com',
      password: 'ClaveSuperSegura2026!',
    };

    it('crea el usuario con rol "superadmin"', async () => {
      const creado = await crearSuperAdministradorInicial(datosSuperAdmin);
      expect(creado.rol).toBe('superadmin');
      expect(creado.activo).toBe(true);
    });

    it('es idempotente: si el email ya existe, no crea un duplicado y devuelve null', async () => {
      await crearSuperAdministradorInicial(datosSuperAdmin);
      const segundoIntento = await crearSuperAdministradorInicial(datosSuperAdmin);

      expect(segundoIntento).toBeNull();
      expect(usuarios).toHaveLength(1);
    });

    it('nunca devuelve passwordHash', async () => {
      const creado = await crearSuperAdministradorInicial(datosSuperAdmin);
      expect(creado.passwordHash).toBeUndefined();
    });
  });
});
