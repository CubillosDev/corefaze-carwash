const inventarioService = require('../services/inventario.service');

/** GET /api/inventario */
const listar = async (_req, res) => {
  const insumos = await inventarioService.listarInsumos();
  return res.status(200).json({ insumos });
};

/** POST /api/inventario */
const crear = async (req, res) => {
  const insumo = await inventarioService.crearInsumo(req.datos.cuerpo, req.usuario.id);
  return res.status(201).json({ mensaje: 'Insumo creado', insumo });
};

/** PUT /api/inventario/:id */
const actualizar = async (req, res) => {
  const insumo = await inventarioService.actualizarInsumo(
    req.datos.parametros.id,
    req.datos.cuerpo,
    req.usuario.id,
  );
  return res.status(200).json({ mensaje: 'Insumo actualizado', insumo });
};

/** PATCH /api/inventario/:id/estado */
const cambiarEstado = async (req, res) => {
  const insumo = await inventarioService.cambiarEstado(
    req.datos.parametros.id,
    req.datos.cuerpo.estado,
    req.usuario.id,
  );
  return res.status(200).json({ mensaje: 'Estado del insumo actualizado', insumo });
};

/** POST /api/inventario/:id/movimientos */
const registrarMovimiento = async (req, res) => {
  const insumo = await inventarioService.registrarMovimiento(
    req.datos.parametros.id,
    req.datos.cuerpo,
    req.usuario.id,
  );
  return res.status(201).json({ mensaje: 'Movimiento registrado', insumo });
};

/** GET /api/inventario/:id/movimientos */
const listarMovimientos = async (req, res) => {
  const movimientos = await inventarioService.listarMovimientos(req.datos.parametros.id);
  return res.status(200).json({ movimientos });
};

module.exports = {
  listar,
  crear,
  actualizar,
  cambiarEstado,
  registrarMovimiento,
  listarMovimientos,
};
