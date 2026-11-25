const { Router } = require('express');
const { autenticarJWT } = require('../middlewares/auth.middleware');
const { autorizarRoles } = require('../middlewares/roles.middleware');
const { ROLES_ENUM } = require('../constants/dominio');
const { registroTrazabilidad } = require('../services/trazabilidad.service');

const router = Router();

// Las métricas revelan qué rutas existen y cuánto tardan: solo superadmin.
const SOLO_SUPERADMIN = autorizarRoles(ROLES_ENUM.SUPERADMIN);

/**
 * @swagger
 * /api/trazabilidad:
 *   get:
 *     tags: [Trazabilidad]
 *     summary: Tiempos de respuesta acumulados por endpoint
 *     description: >
 *       Promedio, mediana, p95, mínimo y máximo de cada ruta desde el último
 *       reinicio, con los errores 4xx y 5xx. Solo guarda el patrón de la ruta,
 *       nunca la URL real ni datos de la petición. Solo superadmin.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200: { description: Métricas por ruta, de la más lenta a la más rápida }
 *       401: { description: Usuario no autenticado }
 *       403: { description: Rol sin permiso }
 *   delete:
 *     tags: [Trazabilidad]
 *     summary: Reiniciar las métricas de trazabilidad
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200: { description: Métricas reiniciadas }
 *       401: { description: Usuario no autenticado }
 *       403: { description: Rol sin permiso }
 */
router.get('/', autenticarJWT, SOLO_SUPERADMIN, (req, res) => {
  res.json({ trazabilidad: registroTrazabilidad.resumen() });
});

router.delete('/', autenticarJWT, SOLO_SUPERADMIN, (req, res) => {
  registroTrazabilidad.reiniciar();
  res.json({ mensaje: 'Métricas de trazabilidad reiniciadas' });
});

module.exports = router;
