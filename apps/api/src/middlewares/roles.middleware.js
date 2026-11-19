const { AccesoDenegado } = require('../utils/errores');
const { ROLES_ENUM, ESTADOS_ORDEN, ESTADOS_JORNADA } = require('../constants/dominio');

/**
 * RBAC (Role-Based Access Control).
 *
 * Debe ir SIEMPRE después de `autenticarJWT` en la cadena de middlewares:
 * depende de que `req.usuario.rol` ya exista (lo pone el JWT verificado).
 * Si el rol del usuario autenticado no está en la lista permitida para esa
 * ruta, corta con 403 antes de llegar al controller — nunca intenta
 * "adivinar" ni degradar el acceso, simplemente lo niega.
 *
 * @param {...string} rolesPermitidos roles del dominio (ver ROLES_ENUM/ROLES en constants/dominio.js)
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

/**
 * Anular (cancelar) una orden de lavado queda reservado a
 * superadmin/administrador; cualquier otra transición de estado sigue
 * abierta a soporte (ver PUEDEN_GESTIONAR en ordenesLavado.routes.js).
 * Como todas las transiciones comparten el mismo endpoint
 * PATCH /:id/estado (el verbo va en el valor de "estado", no en la URL),
 * esta restricción no se puede expresar como un `autorizarRoles(...)`
 * estático por ruta: depende del body ya validado por `validar`, de ahí
 * que la ruta la encadene después en vez de junto a `autenticarJWT`.
 *
 * @returns {import('express').RequestHandler}
 */
const exigirPermisoParaCancelar = (req, _res, next) => {
  if (
    req.datos.cuerpo.estado === ESTADOS_ORDEN.CANCELADA &&
    req.usuario.rol === ROLES_ENUM.SOPORTE
  ) {
    return next(new AccesoDenegado('Solo superadmin o administrador pueden anular una orden'));
  }
  return next();
};

/**
 * Reabrir una jornada cerrada queda reservado a superadmin (criterio de
 * aceptación explícito de SCRUM-139); abrir y cerrar siguen abiertos a
 * superadmin/administrador/soporte (ver PUEDEN_GESTIONAR en
 * jornadas.routes.js). Mismo motivo que `exigirPermisoParaCancelar`: abrir/
 * cerrar/reabrir comparten el endpoint PATCH /:id/estado, así que esto no
 * se puede expresar como un `autorizarRoles(...)` estático por ruta.
 *
 * @returns {import('express').RequestHandler}
 */
const exigirSuperadminParaReabrir = (req, _res, next) => {
  if (
    req.datos.cuerpo.estado === ESTADOS_JORNADA.ABIERTA &&
    req.usuario.rol !== ROLES_ENUM.SUPERADMIN
  ) {
    return next(new AccesoDenegado('Solo superadmin puede reabrir una jornada'));
  }
  return next();
};

module.exports = { autorizarRoles, exigirPermisoParaCancelar, exigirSuperadminParaReabrir };
