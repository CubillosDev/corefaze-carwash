const { body, param, query } = require("express-validator");
const { ESTADOS_ACTIVO_INACTIVO } = require("../constants/dominio");

const idValido = [param("id").isInt({ min: 1 }).withMessage("El id debe ser un entero positivo").toInt()];

const filtrosListado = [query("estado").optional().isIn(ESTADOS_ACTIVO_INACTIVO).withMessage("estado invalido")];

const camposComunes = [
  body("nombre").isString().trim().isLength({ min: 3, max: 100 }).withMessage("nombre debe tener entre 3 y 100 caracteres"),
  body("documento").isString().trim().matches(/^[0-9-]{6,15}$/).withMessage("documento debe tener 6 a 15 caracteres, solo digitos y guion"),
  body("telefono").isString().trim().matches(/^[0-9]{10}$/).withMessage("telefono debe tener exactamente 10 digitos"),
  body("tieneCredito").optional().isBoolean().withMessage("tieneCredito debe ser booleano").toBoolean(),
];

const crear = [...camposComunes];
const actualizar = [...camposComunes, body("estado").optional().isIn(ESTADOS_ACTIVO_INACTIVO).withMessage("estado invalido")];

module.exports = { idValido, filtrosListado, crear, actualizar };