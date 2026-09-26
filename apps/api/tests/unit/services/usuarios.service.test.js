const usuarios = require('../../../src/data/usuarios');
const {
  obtenerUsuarioPorEmail,
  obtenerUsuarioPorId,
  crearUsuario,
  verificarCredenciales,
} = require('../../../src/services/usuarios.service');

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
  rol: 'superadmin',
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
});
