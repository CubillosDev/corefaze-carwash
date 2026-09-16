class AppError extends Error {
  constructor(status, mensaje, errores) {
    super(mensaje);
    this.status = status;
    this.mensaje = mensaje;
    if (errores) this.errores = errores;
  }
}

module.exports = AppError;