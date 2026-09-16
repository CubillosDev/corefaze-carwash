const { body, param, query } = require("express-validator");
const { ESTADOS_ACTIVO_INACTIVO } = require("../constants/dominio");

const idValido = [param("id").isInt({ min: 1 }).withMessage("El id debe ser un entero positivo").toInt()];

const filtrosListado = [query("estado").optional().isIn(ESTADOS_ACTIVO_INACTIVO).withMessage("estado invalido")];

const filtrosOrdenes = [
  query("fecha").optional().isISO8601().withMessage("fecha debe tener formato YYYY-MM-DD")
    .isBefore(new Date().toISOString().slice(0, 10) + "T23:59:59").withMessage("fecha no puede ser futura"),
];

const camposComunes = [
  body("codigo").isString().trim().matches(/^[0-9]{3}$/).withMessage("codigo debe tener exactamente 3 digitos"),
  body("nombre").isString().trim().isLength({ min: 3, max: 100 }).withMessage("nombre debe tener entre 3 y 100 caracteres"),
  body("telefono").isString().trim().matches(/^[0-9]{10}$/).withMessage("telefono debe tener exactamente 10 digitos"),
  body("porcentajeComision").isFloat({ min: 0, max: 1 }).withMessage("porcentajeComision debe estar entre 0 y 1").toFloat(),
];

const crear = [...camposComunes];
const actualizar = [...camposComunes];
const cambiarEstado = [body("estado").isIn(ESTADOS_ACTIVO_INACTIVO).withMessage("estado debe ser activo o inactivo")];

module.exports = { idValido, filtrosListado, filtrosOrdenes, crear, actualizar, cambiarEstado };