const ordenesLavadoService = require('../services/ordenesLavado.service');

/**
 * Con Express 5, un error lanzado en un handler async llega al middleware
 * de errores solo: no hace falta try/catch aquí si no hay lógica extra en
 * el catch (ver errores.middleware.js).
 */

/** GET /api/ordenes-lavado */
const listar = async (req, res) => {
  const { fecha, colaboradorId, servicioId, medioPago, jornadaId } = req.datos.consulta;
  const ordenes = await ordenesLavadoService.listarOrdenes({
    fecha,
    colaboradorId,
    servicioId,
    medioPago,
    jornadaId,
  });
  // Los totales se calculan SIEMPRE sobre este mismo arreglo filtrado,
  // para que coincidan exactamente con lo que el cliente ve en pantalla.
  return res.status(200).json({ ordenes, totales: ordenesLavadoService.calcularTotales(ordenes) });
};

/** GET /api/ordenes-lavado/:id */
const obtenerPorId = async (req, res) => {
  const { id } = req.datos.parametros;
  const orden = await ordenesLavadoService.obtenerOrdenOFallar(id);
  return res.status(200).json({ orden });
};

/** POST /api/ordenes-lavado */
const crear = async (req, res) => {
  const orden = await ordenesLavadoService.crearOrden(req.datos.cuerpo, req.usuario.id);
  return res.status(201).json({ mensaje: 'Orden de lavado registrada correctamente', orden });
};

/** PATCH /api/ordenes-lavado/:id */
const editar = async (req, res) => {
  const { id } = req.datos.parametros;
  const orden = await ordenesLavadoService.editarOrden(id, req.datos.cuerpo, req.usuario.id);
  return res.status(200).json({ mensaje: 'Orden de lavado actualizada correctamente', orden });
};

/** PATCH /api/ordenes-lavado/:id/estado */
const cambiarEstado = async (req, res) => {
  const { id } = req.datos.parametros;
  const { estado, motivo } = req.datos.cuerpo;
  const orden = await ordenesLavadoService.cambiarEstadoOrden(id, estado, motivo, req.usuario.id);
  return res.status(200).json({ mensaje: 'Estado de la orden actualizado correctamente', orden });
};

module.exports = { listar, obtenerPorId, crear, editar, cambiarEstado };
