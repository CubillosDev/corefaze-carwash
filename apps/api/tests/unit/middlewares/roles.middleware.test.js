const { autorizarRoles } = require('../../../src/middlewares/roles.middleware');
const { AccesoDenegado } = require('../../../src/utils/errores');

const ejecutar = (rol, ...rolesPermitidos) => {
  const req = { usuario: { id: 1, email: 'x@x.com', rol } };
  const next = jest.fn();
  autorizarRoles(...rolesPermitidos)(req, {}, next);
  return next;
};

describe('autorizarRoles', () => {
  it('deja pasar (next sin argumentos) cuando el rol del usuario está permitido', () => {
    const next = ejecutar('administrador', 'superadmin', 'administrador');
    expect(next).toHaveBeenCalledWith();
  });

  it('responde 403 (AccesoDenegado) cuando el rol no está en la lista permitida', () => {
    const next = ejecutar('soporte', 'superadmin', 'administrador');

    const [error] = next.mock.calls[0];
    expect(error).toBeInstanceOf(AccesoDenegado);
    expect(error.estado).toBe(403);
    expect(error.message).toBe('No tiene permisos para realizar esta operación');
  });

  it('responde 403 a un rol "pendiente" aunque la ruta acepte varios roles', () => {
    const next = ejecutar('pendiente', 'superadmin', 'administrador', 'soporte');

    const [error] = next.mock.calls[0];
    expect(error).toBeInstanceOf(AccesoDenegado);
  });

  it('permite configurarse con un único rol', () => {
    const next = ejecutar('superadmin', 'superadmin');
    expect(next).toHaveBeenCalledWith();
  });
});
