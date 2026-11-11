const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Valida el formulario de ingreso. Es solo una ayuda para quien escribe: la
 * API vuelve a validar. No se revisa la fortaleza de la contraseña, solo que
 * exista.
 *
 * @param {{ email?: string, password?: string }} valores
 * @returns {{ valido: boolean, errores: { email?: string, password?: string }, datos: { email: string, password: string } }}
 */
export function validarInicioSesion({ email = '', password = '' } = {}) {
  const correo = email.trim();
  const errores = {};

  if (correo === '') {
    errores.email = 'Escribe tu correo electrónico.';
  } else if (!PATRON_CORREO.test(correo)) {
    errores.email = 'Escribe un correo válido, por ejemplo nombre@empresa.com.';
  }

  if (password === '') {
    errores.password = 'Escribe tu contraseña.';
  }

  return {
    valido: Object.keys(errores).length === 0,
    errores,
    datos: { email: correo, password },
  };
}
