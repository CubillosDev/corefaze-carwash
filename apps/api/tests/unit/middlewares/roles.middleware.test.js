const {
  autorizarRoles,
  exigirPermisoParaCancelar,
  exigirSuperadminParaReabrir,
} = require('../../../src/middlewares/roles.middleware');
const { AccesoDenegado } = require('../../../src/utils/errores');

const ejecutar = (rol, ...rolesPermitidos) => {
  const req = { usuario: { id: 1, email: 'x@x.com', rol } };
  const next = jest.fn();
  autorizarRoles(...rolesPermitidos)(req, {}, next);
  return next;
};

const ejecutarConBody = (middleware, { rol, estado }) => {
  const req = { usuario: { id: 1, email: 'x@x.com', rol }, datos: { cuerpo: { estado } } };
  const next = jest.fn();
  middleware(req, {}, next);
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

describe('exigirPermisoParaCancelar (hallazgo de revisión del PR #7: movido desde ordenesLavado.routes.js)', () => {
  it('responde 403 si soporte intenta cancelar (anular) una orden', () => {
    const next = ejecutarConBody(exigirPermisoParaCancelar, {
      rol: 'soporte',
      estado: 'cancelada',
    });

    const [error] = next.mock.calls[0];
    expect(error).toBeInstanceOf(AccesoDenegado);
  });

  it('deja pasar a administrador cancelando una orden', () => {
    const next = ejecutarConBody(exigirPermisoParaCancelar, {
      rol: 'administrador',
      estado: 'cancelada',
    });
    expect(next).toHaveBeenCalledWith();
  });

  it('deja pasar a superadmin cancelando una orden', () => {
    const next = ejecutarConBody(exigirPermisoParaCancelar, {
      rol: 'superadmin',
      estado: 'cancelada',
    });
    expect(next).toHaveBeenCalledWith();
  });

  it('deja pasar a soporte en cualquier otra transición de estado', () => {
    const next = ejecutarConBody(exigirPermisoParaCancelar, {
      rol: 'soporte',
      estado: 'en_proceso',
    });
    expect(next).toHaveBeenCalledWith();
  });
});

describe('exigirSuperadminParaReabrir (hallazgo de revisión del PR #7: movido desde jornadas.routes.js)', () => {
  it('responde 403 si administrador intenta reabrir una jornada', () => {
    const next = ejecutarConBody(exigirSuperadminParaReabrir, {
      rol: 'administrador',
      estado: 'abierta',
    });

    const [error] = next.mock.calls[0];
    expect(error).toBeInstanceOf(AccesoDenegado);
  });

  it('responde 403 si soporte intenta reabrir una jornada', () => {
    const next = ejecutarConBody(exigirSuperadminParaReabrir, {
      rol: 'soporte',
      estado: 'abierta',
    });

    const [error] = next.mock.calls[0];
    expect(error).toBeInstanceOf(AccesoDenegado);
  });

  it('deja pasar a superadmin reabriendo una jornada', () => {
    const next = ejecutarConBody(exigirSuperadminParaReabrir, {
      rol: 'superadmin',
      estado: 'abierta',
    });
    expect(next).toHaveBeenCalledWith();
  });

  it('deja pasar a cualquier rol permitido al cerrar (no reabrir)', () => {
    const next = ejecutarConBody(exigirSuperadminParaReabrir, {
      rol: 'administrador',
      estado: 'cerrada',
    });
    expect(next).toHaveBeenCalledWith();
  });
});
