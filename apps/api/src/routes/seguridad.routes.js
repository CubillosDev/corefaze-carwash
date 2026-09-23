const { Router } = require('express');

const router = Router();

/**
 * GET /api/seguridad/cliente: devuelve la identidad del cliente autenticado
 * por el middleware de API Key. Sirve para demostrar que la API distingue
 * quién la está consumiendo, aunque todavía no distinga usuarios (Bloque 4).
 */

/**
 * @swagger
 * /api/seguridad/cliente:
 *   get:
 *     tags:
 *       - Seguridad
 *     summary: Obtener información del cliente autenticado
 *     description: Retorna la identidad asociada a la API Key utilizada.
 *     responses:
 *       200:
 *         description: Cliente autenticado correctamente
 *       401:
 *         description: API Key ausente o inválida
 *       403:
 *         description: API Key deshabilitada
 */
router.get('/cliente', (req, res) => {
  res.json({ mensaje: 'Cliente autenticado', cliente: req.clienteApi });
});

module.exports = router;
