const { verificarToken } = require('../utils/jwt.util');
const { NoAutenticado } = require('../utils/errores');

const NOMBRE_HEADER = 'Authorization';
const ESQUEMA_ESPERADO = 'Bearer';

/**
 * Exige un JWT válido en el header Authorization: Bearer <token>.
 * Si es válido, expone al usuario autenticado en req.usuario — distinto de
 * req.clienteApi (que identifica la APLICACIÓN, no la persona).
 */
const autenticarJWT = (req, _res, next) => {
  const encabezado = req.get(NOMBRE_HEADER);

  if (!encabezado) {
    return next(new NoAutenticado('Token de autenticación requerido'));
  }

  const [esquema, token] = encabezado.split(' ');

  if (esquema !== ESQUEMA_ESPERADO || !token) {
    return next(new NoAutenticado('Formato de token inválido'));
  }

  try {
    const payload = verificarToken(token);
    req.usuario = { id: Number(payload.sub), email: payload.email, rol: payload.rol };
    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new NoAutenticado('Token expirado'));
    }
    return next(new NoAutenticado('Token inválido'));
  }
};

module.exports = { autenticarJWT };
