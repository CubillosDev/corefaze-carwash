const { query } = require('express-validator');
const { diasDelRango } = require('../utils/fechaNegocio');

const MAXIMO_DIAS = 366;

const fecha = (campo) =>
  query(campo)
    .isISO8601({ strict: true })
    .withMessage(`${campo} debe ser una fecha YYYY-MM-DD`)
    .bail()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage(`${campo} debe ser una fecha YYYY-MM-DD`);

const validarResumen = [
  fecha('desde'),
  fecha('hasta')
    .bail()
    .custom((hasta, { req }) => hasta >= req.query.desde)
    .withMessage('hasta no puede ser anterior a desde')
    .bail()
    .custom((hasta, { req }) => diasDelRango(req.query.desde, hasta) <= MAXIMO_DIAS)
    .withMessage(`El periodo no puede pasar de ${MAXIMO_DIAS} días`),
];

const validarIngresosPorHora = [fecha('fecha').optional()];

module.exports = { validarResumen, validarIngresosPorHora };
