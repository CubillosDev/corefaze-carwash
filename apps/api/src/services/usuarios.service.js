const { supabase, crearClienteConUsuario } = require('../db/supabaseCliente');
const { aCamelCase } = require('../utils/mapearCampos');
const { generarPasswordHash, verificarPassword } = require('../utils/password.util');
const { Conflicto, NoEncontrado } = require('../utils/errores');
const { crearTraductorErroresPostgres } = require('../utils/traducirErrorPostgres');

// Nunca *: así nunca se filtra password_hash (ni intentos_fallidos ni
// bloqueado_hasta — columnas de un bloqueo por intentos fallidos que la
// migración ya reservó pero que todavía no existe como funcionalidad en
// la API) mientras el contrato HTTP no las incluya. password_hash se
// selecciona aparte, solo donde hace falta (verificarCredenciales).
const COLUMNAS = 'id, nombre, email, rol, activo, creado_en';

const POR_PAGINA_DEFECTO = 20;
const POR_PAGINA_MAXIMO = 100;

/**
 * Convierte un texto de búsqueda en un patrón `ilike` ("%texto%") listo
 * para interpolar dentro de `.or(...)`, encerrado en comillas dobles
 * para que una coma o un paréntesis en el texto no cierre la condición
 * `ilike` a mitad de camino y agregue una condición extra no
 * intencionada (p. ej. sobre `rol` o `activo`) — no es una inyección SQL
 * (PostgREST solo puede filtrar columnas reales de esta misma tabla,
 * nada que estos mismos endpoints no expongan ya), pero sí rompe la
 * búsqueda de forma confusa. Backslash-escapar la coma o el paréntesis
 * directamente (`\,` `\(` `\)`) NO funciona — confirmado probándolo
 * contra PostgREST, que solo acepta las comillas dobles para esto;
 * dentro de ellas, solo el backslash y la comilla doble propios
 * necesitan escaparse.
 *
 * @param {string} texto
 * @returns {string} p. ej. `"%texto%"`, listo para ir después de `.ilike.`
 */
const patronIlikeSeguro = (texto) =>
  `"%${texto.replace(/[\\"]/g, (caracter) => `\\${caracter}`)}%"`;

/** Quita el hash de la contraseña antes de que el usuario salga del service. */
const sinPasswordHash = ({ password_hash: _passwordHash, ...resto }) => resto;

/**
 * Traduce un error de Postgres (vía supabase-js) a una de las clases de
 * utils/errores.js. Los códigos son los que la migración de `usuarios`
 * puede disparar.
 */
const traducirErrorPostgres = crearTraductorErroresPostgres({
  tabla: 'usuarios',
  etiqueta: 'usuario',
  mapeo: {
    // 23505 unique_violation: usuarios_email_key.
    23505: () => new Conflicto('Ya existe un usuario con ese correo electrónico'),
  },
});

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
 * Lista usuarios paginados, filtrables por rol, estado y un texto libre
 * que busca en nombre o email (ver `patronIlikeSeguro`). Es la
 * única vía para ver los "pendiente" (filtro `rol: 'pendiente'`): no
 * hace falta un endpoint aparte, ya quedan cubiertos por este filtro.
 *
 * @param {{ rol?: string, activo?: boolean, busqueda?: string, pagina?: number, porPagina?: number }} filtros
 * @returns {Promise<{ usuarios: object[], total: number, pagina: number, porPagina: number, totalPaginas: number }>}
 */
const listarUsuarios = async ({
  rol,
  activo,
  busqueda,
  pagina = 1,
  porPagina = POR_PAGINA_DEFECTO,
} = {}) => {
  const porPaginaEfectivo = Math.min(porPagina, POR_PAGINA_MAXIMO);

  let consulta = supabase.from('usuarios').select(COLUMNAS, { count: 'exact' });

  if (rol !== undefined) {
    consulta = consulta.eq('rol', rol);
  }

  if (activo !== undefined) {
    consulta = consulta.eq('activo', activo);
  }

  if (busqueda) {
    const patron = patronIlikeSeguro(busqueda);
    consulta = consulta.or(`nombre.ilike.${patron},email.ilike.${patron}`);
  }

  const desde = (pagina - 1) * porPaginaEfectivo;
  const hasta = desde + porPaginaEfectivo - 1;

  const { data, count, error } = await consulta
    .order('id', { ascending: true })
    .range(desde, hasta);

  if (error) {
    throw new Error(`No se pudo listar usuarios: ${error.message}`);
  }

  return {
    usuarios: aCamelCase(data),
    total: count,
    pagina,
    porPagina: porPaginaEfectivo,
    totalPaginas: Math.max(1, Math.ceil(count / porPaginaEfectivo)),
  };
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
 * Invariante entre FILAS (cuántos superadmin activos quedan en TODO el
 * sistema, excluyendo a `idExcluido`), no algo que un CHECK de una sola
 * fila pueda expresar: se valida aquí, nunca solo en la BD (mismo motivo
 * que la gracia de colaboradores). La usan `asignarRol` (quitarle el rol
 * de superadmin a alguien) y `cambiarEstadoUsuario` (desactivar a un
 * superadmin) — ambas operaciones reducen el conteo de superadmin
 * activos exactamente igual, así que comparten esta sola verificación.
 *
 * @param {number|string} idExcluido el usuario cuyo cambio se está evaluando
 * @throws {Conflicto} si no quedaría ningún otro superadmin activo
 */
const exigirQueQuedeOtroSuperadminActivo = async (idExcluido) => {
  const { count, error } = await supabase
    .from('usuarios')
    .select('id', { count: 'exact', head: true })
    .eq('rol', 'superadmin')
    .eq('activo', true)
    .neq('id', idExcluido);

  if (error) {
    throw new Error(`No se pudo verificar los superadmin activos: ${error.message}`);
  }

  if (count === 0) {
    throw new Conflicto('No puede quedar el sistema sin ningún superadmin activo');
  }
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
 * superadmin activo además de él (`exigirQueQuedeOtroSuperadminActivo`).
 * La regla aplica sin importar quién hace la petición — no es "no te
 * quites tu propio rol a ti mismo", es "que siempre quede alguien que
 * pueda volver a asignar roles"; eso cubre también el caso de quitarle
 * el rol a OTRO superadmin si es el último. Nunca bloquea que uno mismo
 * se quite su propio rol de superadmin cuando queda otro activo — eso
 * ya está intencionalmente permitido (ver la descripción del Bloque 6 y
 * sus pruebas), así que SCRUM-141 no le agrega una restricción nueva.
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
    await exigirQueQuedeOtroSuperadminActivo(id);
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

/**
 * Cambia el estado activo/inactivo de un usuario (administración de
 * cuentas, SCRUM-141). Reglas de negocio, en este orden:
 *
 * 1. Nadie puede desactivarse A SÍ MISMO con este endpoint — evita que
 *    alguien se bloquee el propio acceso por accidente. Aplica siempre,
 *    sin importar el rol (en la práctica solo superadmin llega aquí, ver
 *    autorizarRoles en la ruta).
 * 2. No puede quedar el sistema sin ningún superadmin activo — misma
 *    invariante entre filas que `asignarRol` (ver su comentario), vía el
 *    mismo helper `exigirQueQuedeOtroSuperadminActivo`: desactivar a un
 *    superadmin reduce el conteo de activos exactamente igual que
 *    quitarle el rol.
 *
 * @param {number|string} id
 * @param {boolean} activo
 * @param {number} usuarioId quién hace el cambio (lo lee registrar_auditoria())
 * @returns {Promise<object>} el usuario actualizado (sin passwordHash)
 * @throws {NoEncontrado} si el id no existe
 * @throws {Conflicto} si intenta desactivarse a sí mismo, o si desactivar a este
 *   usuario deja el sistema sin ningún superadmin activo
 */
const cambiarEstadoUsuario = async (id, activo, usuarioId) => {
  const usuario = await obtenerUsuarioOFallar(id);

  if (activo === false) {
    if (Number(id) === Number(usuarioId)) {
      throw new Conflicto('No puedes desactivarte a ti mismo');
    }

    if (usuario.rol === 'superadmin') {
      await exigirQueQuedeOtroSuperadminActivo(id);
    }
  }

  const { data, error } = await crearClienteConUsuario(usuarioId)
    .from('usuarios')
    .update({ activo })
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
  listarUsuarios,
  crearUsuario,
  verificarCredenciales,
  asignarRol,
  cambiarEstadoUsuario,
};
