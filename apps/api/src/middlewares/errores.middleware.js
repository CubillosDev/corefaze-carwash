const { env } = require('../config/env');
const { ErrorHttp, NoEncontrado } = require('../utils/errores');

const ERRORES_DE_LECTURA_DEL_CUERPO = Object.freeze({
  'entity.parse.failed': { estado: 400, mensaje: 'El cuerpo de la petición no es un JSON válido' },
  'entity.too.large': {
    estado: 413,
    mensaje: 'El cuerpo de la petición supera el tamaño permitido',
  },
});

const MENSAJE_ERROR_INTERNO = 'Error interno del servidor';

/** Se registra DESPUÉS de todas las rutas: atrapa cualquier URL que no exista. */
const rutaNoEncontrada = (_req, _res, next) => {
  next(new NoEncontrado('Ruta no encontrada'));
};

/**
 * Único punto donde un error se convierte en respuesta HTTP. Express lo
 * reconoce como manejador de errores por tener EXACTAMENTE cuatro parámetros.
 * Con Express 5, un error lanzado en un handler (incluso async) llega aquí solo.
 */
const manejarErrores = (error, _req, res, _next) => {
  if (error instanceof ErrorHttp) {
    return res.status(error.estado).json(error.aCuerpo());
  }

  const errorDeLectura = ERRORES_DE_LECTURA_DEL_CUERPO[error.type];
  if (errorDeLectura) {
    return res.status(errorDeLectura.estado).json({ mensaje: errorDeLectura.mensaje });
  }

  // Error inesperado: el detalle se queda en el servidor, el cliente no recibe pila ni datos
  if (env.entorno !== 'test') {
    // eslint-disable-next-line no-console
    console.error(error);
  }
  return res.status(500).json({ mensaje: MENSAJE_ERROR_INTERNO });
};

module.exports = { rutaNoEncontrada, manejarErrores };
