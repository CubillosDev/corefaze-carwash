/**
 * Errores del dominio HTTP. Los services y middlewares LANZAN (o pasan a next)
 * estas clases; el middleware de errores es el único que las convierte en respuesta.
 * Así ningún controller arma respuestas de error a mano.
 */
class ErrorHttp extends Error {
  /**
   * @param {number} estado Código HTTP de la respuesta
   * @param {string} mensaje Texto que verá el cliente (nunca datos internos)
   */
  constructor(estado, mensaje) {
    super(mensaje);
    this.name = this.constructor.name;
    this.estado = estado;
  }

  /** Cuerpo JSON de la respuesta: { mensaje } */
  aCuerpo() {
    return { mensaje: this.message };
  }
}

/** 400: la entrada no cumple el formato. Agrega el detalle por campo. */
class SolicitudInvalida extends ErrorHttp {
  /** @param {Array<{campo: string, mensaje: string}>} errores */
  constructor(errores = [], mensaje = 'Datos de entrada inválidos') {
    super(400, mensaje);
    this.errores = errores;
  }

  aCuerpo() {
    return { mensaje: this.message, errores: this.errores };
  }
}

/** 401: falta la API Key o es incorrecta. */
class NoAutenticado extends ErrorHttp {
  constructor(mensaje = 'API Key inválida o ausente') {
    super(401, mensaje);
  }
}

/** 404: el recurso (o la ruta) no existe. */
class NoEncontrado extends ErrorHttp {
  constructor(mensaje = 'Recurso no encontrado') {
    super(404, mensaje);
  }
}

/** 409: la petición es válida pero choca con el estado del negocio. */
class Conflicto extends ErrorHttp {
  constructor(mensaje) {
    super(409, mensaje);
  }
}

module.exports = { ErrorHttp, SolicitudInvalida, NoAutenticado, NoEncontrado, Conflicto };
