const usuarios = require('../data/usuarios');
const { generarPasswordHash, verificarPassword } = require('../utils/password.util');

/** Quita el hash de la contraseña antes de que el usuario salga del service. */
const sinPasswordHash = ({ passwordHash: _passwordHash, ...resto }) => resto;

/**
 * Busca un usuario por email (sin distinguir mayúsculas/minúsculas).
 * @param {string} email
 * @returns {object | undefined} el registro completo, CON passwordHash —
 *   para uso interno del service (verificarCredenciales lo necesita).
 */
const buscarPorEmail = (email) =>
  usuarios.find((usuario) => usuario.email.toLowerCase() === email.toLowerCase());

/**
 * Obtiene un usuario por email, ya sin su hash de contraseña.
 * @param {string} email
 * @returns {object | null}
 */
const obtenerUsuarioPorEmail = (email) => {
  const usuario = buscarPorEmail(email);
  return usuario ? sinPasswordHash(usuario) : null;
};

/**
 * Obtiene un usuario por su id, ya sin su hash de contraseña.
 * @param {number|string} id
 * @returns {object | null}
 */
const obtenerUsuarioPorId = (id) => {
  const usuario = usuarios.find((candidato) => candidato.id === Number(id));
  return usuario ? sinPasswordHash(usuario) : null;
};

/**
 * Crea un usuario nuevo. El id se asigna aquí (consecutivo simple, como en
 * el resto de recursos en memoria) y la contraseña se hashea antes de guardarla.
 *
 * @param {{ nombre: string, email: string, password: string, rol: string }} datos
 * @returns {Promise<object>} el usuario creado, sin passwordHash
 */
const crearUsuario = async (datos) => {
  const passwordHash = await generarPasswordHash(datos.password);

  const nuevoUsuario = {
    id: usuarios.length > 0 ? Math.max(...usuarios.map((usuario) => usuario.id)) + 1 : 1,
    nombre: datos.nombre,
    email: datos.email.toLowerCase(),
    passwordHash,
    rol: datos.rol,
    activo: true,
  };

  usuarios.push(nuevoUsuario);
  return sinPasswordHash(nuevoUsuario);
};

/**
 * Verifica un email y contraseña. Nunca distingue en su resultado si el
 * email no existe o si la contraseña es incorrecta (evita revelar cuál
 * parte de las credenciales falló).
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<object | null>} el usuario si las credenciales son
 *   correctas (sin passwordHash); null en cualquier otro caso
 */
const verificarCredenciales = async (email, password) => {
  const usuario = buscarPorEmail(email);

  if (!usuario) {
    return null;
  }

  const passwordValida = await verificarPassword(password, usuario.passwordHash);

  if (!passwordValida) {
    return null;
  }

  return sinPasswordHash(usuario);
};

module.exports = {
  obtenerUsuarioPorEmail,
  obtenerUsuarioPorId,
  crearUsuario,
  verificarCredenciales,
};
