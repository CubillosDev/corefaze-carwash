const { Router } = require('express');

const router = Router();

/**
 * GET /api/salud: comprueba que la API está viva. Es pública a propósito
 * (la usan monitores y el despliegue) y por eso no revela versión ni configuración.
 */
router.get('/', (_req, res) => {
  res.json({ estado: 'ok' });
});

module.exports = router;
