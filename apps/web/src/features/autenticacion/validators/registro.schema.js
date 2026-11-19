const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Los mismos límites que valida POST /api/auth/registro. */
export const LIMITES_REGISTRO = Object.freeze({
  NOMBRE_MINIMO: 3,
  NOMBRE_MAXIMO: 100,
  CLAVE_MINIMA: 10,
  CLAVE_MAXIMA: 72,
});

/**
 * Valida la solicitud de acceso. Es una ayuda para quien escribe: la API
 * vuelve a validar y decide el rol (siempre `pendiente`).
 *
 * @param {{ nombre?: string, email?: string, password?: string, confirmacion?: string }} valores
 * @returns {{ valido: boolean, errores: Record<string, string>, datos: { nombre: string, email: string, password: string } }}
 */
export function validarRegistro({ nombre = '', email = '', password = '', confirmacion = '' } = {}) {
  const nombreLimpio = nombre.trim().replace(/\s+/g, ' ');
  const correo = email.trim();
  const errores = {};

  if (nombreLimpio.length < LIMITES_REGISTRO.NOMBRE_MINIMO) {
    errores.nombre = 'Escribe tu nombre completo.';
  } else if (nombreLimpio.length > LIMITES_REGISTRO.NOMBRE_MAXIMO) {
    errores.nombre = `Máximo ${LIMITES_REGISTRO.NOMBRE_MAXIMO} caracteres.`;
  }

  if (correo === '') {
    errores.email = 'Escribe tu correo electrónico.';
  } else if (!PATRON_CORREO.test(correo)) {
    errores.email = 'Escribe un correo válido, por ejemplo nombre@empresa.com.';
  }

  if (password.length < LIMITES_REGISTRO.CLAVE_MINIMA) {
    errores.password = `Usa al menos ${LIMITES_REGISTRO.CLAVE_MINIMA} caracteres.`;
  } else if (password.length > LIMITES_REGISTRO.CLAVE_MAXIMA) {
    errores.password = `Máximo ${LIMITES_REGISTRO.CLAVE_MAXIMA} caracteres.`;
  }

  if (confirmacion !== password) {
    errores.confirmacion = 'Las contraseñas no coinciden.';
  }

  return {
    valido: Object.keys(errores).length === 0,
    errores,
    datos: { nombre: nombreLimpio, email: correo, password },
  };
}
