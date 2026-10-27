const { supabase, crearClienteConUsuario } = require('../db/supabaseCliente');
const { aCamelCase } = require('../utils/mapearCampos');
const { generarPasswordHash, verificarPassword } = require('../utils/password.util');
const { Conflicto, NoEncontrado, SolicitudInvalida } = require('../utils/errores');

// Nunca *: así nunca se filtra password_hash (ni intentos_fallidos ni
// bloqueado_hasta — columnas de un bloqueo por intentos fallidos que la
// migración ya reservó pero que todavía no existe como funcionalidad en
// la API) mientras el contrato HTTP no las incluya. password_hash se
// selecciona aparte, solo donde hace falta (verificarCredenciales).
const COLUMNAS = 'id, nombre, email, rol, activo';

/** Quita el hash de la contraseña antes de que el usuario salga del service. */
const sinPasswordHash = ({ password_hash: _passwordHash, ...resto }) => resto;

/**
 * Traduce un error de Postgres (vía supabase-js) a una de las clases de
 * utils/errores.js. Los códigos son los que la migración de `usuarios`
 * puede disparar.
 */
const traducirErrorPostgres = (error) => {
  // 23505 unique_violation: usuarios_email_key.
  if (error.code === '23505') {
    return new Conflicto('Ya existe un usuario con ese correo electrónico');
  }

  // 23514 check_violation: formato o regla de negocio de usuarios.
  if (error.code === '23514') {
    return new SolicitudInvalida([], 'Datos de usuario inválidos');
  }

  return new Error(`Error de base de datos en usuarios: ${error.message}`);
};

/**
 * Obtiene un usuario por email (sin distinguir mayúsculas/minúsculas), ya
 * sin su hash de contraseña.
 * @param {string} email
 * @returns {Promise<object | null>}
 */
const obtenerUsuarioPorEmail = async (email) => {
  const { data, error } = await supabase
    .from('usuarios')
    .select(COLUMNAS)
    .eq('email', email.toLowerCase())
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo obtener el usuario: ${error.message}`);
  }

  return data ? aCamelCase(data) : null;
};

/**
 * Obtiene un usuario por su id, ya sin su hash de contraseña. La usa
 * autenticarJWT en CADA petición autenticada, para que un cambio de rol
 * (o una desactivación) surta efecto de inmediato sin esperar a que el
 * token expire (hallazgo de revisión del PR #7).
 * @param {number|string} id
 * @returns {Promise<object | null>}
 */
const obtenerUsuarioPorId = async (id) => {
  const { data, error } = await supabase
    .from('usuarios')
    .select(COLUMNAS)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo obtener el usuario: ${error.message}`);
  }

  return data ? aCamelCase(data) : null;
};

/**
 * Obtiene un usuario por id, o lanza NoEncontrado (404).
 * @param {number|string} id
 * @returns {Promise<object>}
 * @throws {NoEncontrado}
 */
const obtenerUsuarioOFallar = async (id) => {
  const usuario = await obtenerUsuarioPorId(id);
  if (!usuario) {
    throw new NoEncontrado('Usuario no encontrado');
  }
  return usuario;
};

/**
 * Crea un usuario nuevo a través del registro público.
 *
 * Seguridad (allowlisting explícito): el objeto se construye campo por
 * campo, tomando de `datos` únicamente nombre, email y password. Cualquier
 * otro campo que el cliente haya enviado (rol, activo, id, passwordHash,
 * esSuperAdmin, permisos...) NO llega aquí siquiera, porque el validador ya
 * los descarta antes (ver auth.validator.js).
 *
 * `rol` y `activo` los decide el servidor, nunca el cliente: ambos los
 * fija el default de su columna ('pendiente' y true) — nadie se
 * auto-asigna acceso con privilegios; solo un superadmin, en una
 * operación administrativa aparte, puede asignar el rol real de un
 * usuario. El email duplicado (409) lo rechaza el UNIQUE de la BD,
 * traducido por traducirErrorPostgres.
 *
 * No hay un usuario autenticado todavía que haga este cambio (es un
 * registro público, anónimo): crearClienteConUsuario(null) deja claro
 * que no hubo actor, en vez de usar el cliente singleton para una
 * escritura.
 *
 * @param {{ nombre: string, email: string, password: string }} datos
 * @returns {Promise<object>} el usuario creado, sin passwordHash
 */
const crearUsuario = async (datos) => {
  const passwordHash = await generarPasswordHash(datos.password);

  const { data, error } = await crearClienteConUsuario(null)
    .from('usuarios')
    .insert({
      nombre: datos.nombre,
      email: datos.email.toLowerCase(),
      password_hash: passwordHash,
    })
    .select(COLUMNAS)
    .single();

  if (error) {
    throw traducirErrorPostgres(error);
  }

  return aCamelCase(data);
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
  const { data, error } = await supabase
    .from('usuarios')
    .select(`${COLUMNAS}, password_hash`)
    .eq('email', email.toLowerCase())
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo obtener el usuario: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const passwordValida = await verificarPassword(password, data.password_hash);

  if (!passwordValida) {
    return null;
  }

  return aCamelCase(sinPasswordHash(data));
};

/**
 * Asigna un rol operativo a un usuario existente (RBAC, Bloque 6).
 *
 * Esta es la ÚNICA forma de que un usuario deje de ser "pendiente": nunca a
 * través del registro público (ver `crearUsuario`). Quien llame a esta
 * función ya debe haber verificado que quien la invoca es "superadmin"
 * (responsabilidad del middleware `autorizarRoles`, no de este service).
 *
 * Regla de negocio (hallazgo de revisión del PR #7): el sistema nunca
 * puede quedar sin ningún superadmin activo. Si el usuario objetivo es
 * superadmin y el rol nuevo es distinto, se exige que quede AL MENOS otro
 * superadmin activo además de él. La regla aplica sin importar quién hace
 * la petición — no es "no te quites tu propio rol a ti mismo", es "que
 * siempre quede alguien que pueda volver a asignar roles"; eso cubre
 * también el caso de quitarle el rol a OTRO superadmin si es el último.
 *
 * Es una invariante entre FILAS (cuántos superadmin activos quedan), no
 * algo que un CHECK de una sola fila pueda expresar: se valida aquí,
 * nunca solo en la BD (mismo motivo que la gracia de colaboradores).
 *
 * @param {number|string} id
 * @param {string} rol uno de los roles del dominio (ver constants/dominio.js ROLES)
 * @param {number} usuarioId quién hace el cambio (lo lee registrar_auditoria())
 * @returns {Promise<object>} el usuario actualizado (sin passwordHash)
 * @throws {NoEncontrado} si el id no existe
 * @throws {Conflicto} si degradar a este usuario deja el sistema sin ningún superadmin activo
 */
const asignarRol = async (id, rol, usuarioId) => {
  const usuario = await obtenerUsuarioOFallar(id);

  if (usuario.rol === 'superadmin' && rol !== 'superadmin') {
    const { count, error } = await supabase
      .from('usuarios')
      .select('id', { count: 'exact', head: true })
      .eq('rol', 'superadmin')
      .eq('activo', true)
      .neq('id', id);

    if (error) {
      throw new Error(`No se pudo verificar los superadmin activos: ${error.message}`);
    }

    if (count === 0) {
      throw new Conflicto('No puede quedar el sistema sin ningún superadmin activo');
    }
  }

  const { data, error } = await crearClienteConUsuario(usuarioId)
    .from('usuarios')
    .update({ rol })
    .eq('id', id)
    .select(COLUMNAS)
    .single();

  if (error) {
    throw traducirErrorPostgres(error);
  }

  return aCamelCase(data);
};

module.exports = {
  obtenerUsuarioPorEmail,
  obtenerUsuarioPorId,
  obtenerUsuarioOFallar,
  crearUsuario,
  verificarCredenciales,
  asignarRol,
};
