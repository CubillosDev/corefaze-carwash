const { verificarToken } = require('../utils/jwt.util');
const { obtenerUsuarioPorId } = require('../services/usuarios.service');
const { NoAutenticado } = require('../utils/errores');

const NOMBRE_HEADER = 'Authorization';
const ESQUEMA_ESPERADO = 'Bearer';

/**
 * Exige un JWT válido en el header Authorization: Bearer <token>.
 * Si es válido, expone al usuario autenticado en req.usuario — distinto de
 * req.clienteApi (que identifica la APLICACIÓN, no la persona).
 *
 * NO es puro respecto al token (hallazgo de revisión del PR #7): el JWT
 * solo prueba identidad y vigencia (firma + expiración, hasta
 * JWT_EXPIRES_IN), pero su payload.rol se fijó en el login y puede quedar
 * desactualizado si al usuario le cambian el rol después — hasta esa
 * ventana, un token viejo seguiría operando con el rol anterior. Por eso,
 * tras verificar el token, se vuelve a consultar al usuario ACTUAL
 * (obtenerUsuarioPorId) y el `rol` de req.usuario sale siempre de ahí,
 * nunca del payload: un cambio de rol (o una futura desactivación) surte
 * efecto de inmediato, sin esperar a que el token expire. `id` y `email`
 * sí siguen viniendo del token: son estables y no cambian con el rol.
 */
const autenticarJWT = async (req, _res, next) => {
  const encabezado = req.get(NOMBRE_HEADER);

  if (!encabezado) {
    return next(new NoAutenticado('Token de autenticación requerido'));
  }

  const [esquema, token] = encabezado.split(' ');

  if (esquema !== ESQUEMA_ESPERADO || !token) {
    return next(new NoAutenticado('Formato de token inválido'));
  }

  // El try/catch solo envuelve verificarToken (síncrono): un error suyo
  // es siempre "el token es inválido/expiró". obtenerUsuarioPorId ya
  // consulta Supabase (SCRUM-152) — si falla, es un error de
  // infraestructura, no un problema del token, así que se deja propagar
  // como la promesa rechazada que es (Express 5 la reenvía solo al
  // middleware de errores), nunca se traduce a "Token inválido".
  let payload;
  try {
    payload = verificarToken(token);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new NoAutenticado('Token expirado'));
    }
    return next(new NoAutenticado('Token inválido'));
  }

  const usuarioActual = await obtenerUsuarioPorId(payload.sub);

  if (!usuarioActual) {
    return next(new NoAutenticado('Usuario no encontrado'));
  }

  if (usuarioActual.activo === false) {
    return next(new NoAutenticado('Usuario deshabilitado'));
  }

  req.usuario = { id: Number(payload.sub), email: payload.email, rol: usuarioActual.rol };
  return next();
};

module.exports = { autenticarJWT };
