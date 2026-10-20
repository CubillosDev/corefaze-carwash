const { AccesoDenegado } = require('../utils/errores');

/**
 * RBAC (Role-Based Access Control).
 *
 * Debe ir SIEMPRE después de `autenticarJWT` en la cadena de middlewares:
 * depende de que `req.usuario.rol` ya exista (lo pone el JWT verificado).
 * Si el rol del usuario autenticado no está en la lista permitida para esa
 * ruta, corta con 403 antes de llegar al controller — nunca intenta
 * "adivinar" ni degradar el acceso, simplemente lo niega.
 *
 * @param {...string} rolesPermitidos roles del dominio (ver packages/contratos/dominio.json)
 * @returns {import('express').RequestHandler}
 */
const autorizarRoles =
  (...rolesPermitidos) =>
  (req, _res, next) => {
    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return next(new AccesoDenegado('No tiene permisos para realizar esta operación'));
    }
    return next();
  };

module.exports = { autorizarRoles };
