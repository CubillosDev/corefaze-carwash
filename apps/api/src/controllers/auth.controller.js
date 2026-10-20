const { Conflicto, NoAutenticado, AccesoDenegado, NoEncontrado } = require('../utils/errores');
const usuariosService = require('../services/usuarios.service');
const { generarToken } = require('../utils/jwt.util');

/**
 * POST /api/auth/registro
 * req.datos.cuerpo ya viene filtrado por el middleware `validar` (solo
 * nombre, email y password) — protección contra mass assignment.
 */
const registrar = async (req, res, next) => {
  try {
    const datos = req.datos.cuerpo;

    const usuarioExistente = usuariosService.obtenerUsuarioPorEmail(datos.email);
    if (usuarioExistente) {
      throw new Conflicto('Ya existe un usuario con ese correo electrónico');
    }

    const usuario = await usuariosService.crearUsuario(datos);

    return res.status(201).json({
      mensaje: 'Usuario registrado correctamente',
      usuario,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/auth/login
 * Si las credenciales son correctas, genera un JWT (Bloque 5) que el
 * cliente debe enviar en siguientes peticiones protegidas como
 * Authorization: Bearer <token>.
 */
const login = async (req, res, next) => {
  try {
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
  } catch (error) {
    return next(error);
  }
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
const asignarRol = (req, res, next) => {
  try {
    const { id } = req.datos.parametros;
    const { rol } = req.datos.cuerpo;

    const usuario = usuariosService.asignarRol(id, rol);

    if (!usuario) {
      throw new NoEncontrado('Usuario no encontrado');
    }

    return res.status(200).json({
      mensaje: 'Rol asignado correctamente',
      usuario,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = { registrar, login, perfil, asignarRol };
