const { NoAutenticado, AccesoDenegado } = require('../utils/errores');
const usuariosService = require('../services/usuarios.service');
const { generarToken } = require('../utils/jwt.util');

/**
 * Con Express 5, un error lanzado en un handler async llega al middleware
 * de errores solo: no hace falta try/catch aquí si no hay lógica extra en
 * el catch (ver errores.middleware.js).
 */

/**
 * POST /api/auth/registro
 * req.datos.cuerpo ya viene filtrado por el middleware `validar` (solo
 * nombre, email y password) — protección contra mass assignment. El
 * correo duplicado (409) lo rechaza el UNIQUE de la BD, traducido dentro
 * de usuariosService.crearUsuario.
 */
const registrar = async (req, res) => {
  const usuario = await usuariosService.crearUsuario(req.datos.cuerpo);
  return res.status(201).json({ mensaje: 'Usuario registrado correctamente', usuario });
};

/**
 * POST /api/auth/login
 * Si las credenciales son correctas, genera un JWT (Bloque 5) que el
 * cliente debe enviar en siguientes peticiones protegidas como
 * Authorization: Bearer <token>.
 */
const login = async (req, res) => {
  const { email, password } = req.datos.cuerpo;

  const usuario = await usuariosService.verificarCredenciales(email, password);

  if (!usuario) {
    throw new NoAutenticado('Credenciales inválidas');
  }

  if (!usuario.activo) {
    throw new AccesoDenegado('Usuario deshabilitado');
  }

  const token = generarToken(usuario);

  return res.status(200).json({
    mensaje: 'Autenticación correcta',
    usuario,
    token,
  });
};

/**
 * GET /api/auth/perfil
 * Requiere API Key (aplicación) Y JWT (usuario) — ambos niveles a la vez.
 * Endpoint de prueba aislado: todavía no se protege ningún recurso de
 * negocio con JWT (eso llega con RBAC, Bloque 6).
 */
const perfil = (req, res) => {
  return res.status(200).json({
    mensaje: 'Usuario autenticado mediante JWT',
    usuario: req.usuario,
    clienteApi: req.clienteApi,
  });
};

/**
 * PATCH /api/auth/usuarios/:id/rol
 * Única vía para que un usuario deje de ser "pendiente" (RBAC, Bloque 6).
 * Protegida por autenticarJWT + autorizarRoles('superadmin') en la ruta.
 */
const asignarRol = async (req, res) => {
  const { id } = req.datos.parametros;
  const { rol } = req.datos.cuerpo;

  const usuario = await usuariosService.asignarRol(id, rol, req.usuario.id);

  return res.status(200).json({
    mensaje: 'Rol asignado correctamente',
    usuario,
  });
};

module.exports = { registrar, login, perfil, asignarRol };
