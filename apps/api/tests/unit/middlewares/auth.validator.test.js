const { validationResult } = require('express-validator');
const { validarRegistro, validarLogin } = require('../../../src/middlewares/auth.validator');

const ejecutarValidaciones = async (validaciones, cuerpo) => {
  const req = { body: cuerpo };
  for (const validacion of validaciones) {
    await validacion.run(req);
  }
  return validationResult(req);
};

const datosDeRegistroValidos = {
  nombre: 'Administrador Lavadero',
  email: 'admin@lavadero.com',
  password: 'ClaveSegura2026!',
  rol: 'superadmin',
};

describe('auth.validator', () => {
  describe('validarRegistro', () => {
    it('pasa con datos válidos', async () => {
      const resultado = await ejecutarValidaciones(validarRegistro, datosDeRegistroValidos);
      expect(resultado.isEmpty()).toBe(true);
    });

    it('acepta cada uno de los tres roles del dominio', async () => {
      for (const rol of ['superadmin', 'administrador', 'soporte']) {
        const resultado = await ejecutarValidaciones(validarRegistro, {
          ...datosDeRegistroValidos,
          rol,
        });
        expect(resultado.isEmpty()).toBe(true);
      }
    });

    it('rechaza un rol que no existe en el dominio', async () => {
      const resultado = await ejecutarValidaciones(validarRegistro, {
        ...datosDeRegistroValidos,
        rol: 'medico',
      });
      expect(resultado.isEmpty()).toBe(false);
      expect(resultado.array()[0].path).toBe('rol');
    });

    it('rechaza un nombre demasiado corto', async () => {
      const resultado = await ejecutarValidaciones(validarRegistro, {
        ...datosDeRegistroValidos,
        nombre: 'Al',
      });
      expect(resultado.isEmpty()).toBe(false);
    });

    it('rechaza un email inválido', async () => {
      const resultado = await ejecutarValidaciones(validarRegistro, {
        ...datosDeRegistroValidos,
        email: 'no-es-un-correo',
      });
      expect(resultado.isEmpty()).toBe(false);
    });

    it('rechaza una contraseña de menos de 10 caracteres', async () => {
      const resultado = await ejecutarValidaciones(validarRegistro, {
        ...datosDeRegistroValidos,
        password: 'Corta1!',
      });
      expect(resultado.isEmpty()).toBe(false);
    });

    it('rechaza una contraseña de más de 72 caracteres', async () => {
      const resultado = await ejecutarValidaciones(validarRegistro, {
        ...datosDeRegistroValidos,
        password: 'a'.repeat(73),
      });
      expect(resultado.isEmpty()).toBe(false);
    });
  });

  describe('validarLogin', () => {
    it('pasa con datos válidos', async () => {
      const resultado = await ejecutarValidaciones(validarLogin, {
        email: 'admin@lavadero.com',
        password: 'cualquier-cosa',
      });
      expect(resultado.isEmpty()).toBe(true);
    });

    it('rechaza sin contraseña', async () => {
      const resultado = await ejecutarValidaciones(validarLogin, {
        email: 'admin@lavadero.com',
        password: '',
      });
      expect(resultado.isEmpty()).toBe(false);
    });

    it('rechaza un email inválido', async () => {
      const resultado = await ejecutarValidaciones(validarLogin, {
        email: 'no-es-un-correo',
        password: 'cualquier-cosa',
      });
      expect(resultado.isEmpty()).toBe(false);
    });
  });
});
