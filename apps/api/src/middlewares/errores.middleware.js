const AppError = require("../utils/AppError");

// eslint-disable-next-line no-unused-vars
const manejarErrores = (err, req, res, next) => {
  if (err instanceof AppError) {
    const cuerpo = { mensaje: err.mensaje };
    if (err.errores) cuerpo.errores = err.errores;
    return res.status(err.status).json(cuerpo);
  }
  console.error(err);
  return res.status(500).json({ mensaje: "Error interno del servidor" });
};

const rutaNoEncontrada = (req, res) => {
  res.status(404).json({ mensaje: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
};

module.exports = { manejarErrores, rutaNoEncontrada };