const { Conflicto, NoAutenticado, AccesoDenegado } = require('../utils/errores');
const usuariosService = require('../services/usuarios.service');

/**
 * POST /api/auth/registro
 * req.datos.cuerpo ya viene filtrado por el middleware `validar` (solo
 * nombre, email, password y rol) — protección contra mass assignment.
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
 * Todavía no emite JWT (Bloque 5); solo confirma si las credenciales son correctas.
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.datos.cuerpo;

    const usuario = await usuariosService.verificarCredenciales(email, password);

    // Un solo mensaje para email inexistente Y contraseña incorrecta:
    // no revelar cuál de las dos partes de la credencial falló.
    if (!usuario) {
      throw new NoAutenticado('Credenciales inválidas');
    }

    if (!usuario.activo) {
      throw new AccesoDenegado('Usuario deshabilitado');
    }

    return res.status(200).json({
      mensaje: 'Autenticación correcta',
      usuario,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = { registrar, login };
