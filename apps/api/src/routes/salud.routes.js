const { Router } = require('express');

const router = Router();

/**
 * GET /api/salud: comprueba que la API está viva. Es pública a propósito
 * (la usan monitores y el despliegue) y por eso no revela versión ni configuración.
 */

/**
 * @swagger
 * /api/salud:
 *   get:
 *     tags: [Salud]
 *     summary: Comprueba que la API está viva
 *     security: []
 *     responses:
 *       200:
 *         description: Servicio operativo
 */
router.get('/', (_req, res) => {
  res.json({ estado: 'ok' });
});

module.exports = router;
