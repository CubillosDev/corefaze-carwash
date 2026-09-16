const { body, param, query } = require("express-validator");
const { TIPOS_VEHICULO } = require("../constants/dominio");

const idValido = [param("id").isInt({ min: 1 }).withMessage("El id debe ser un entero positivo").toInt()];
const filtrosListado = [query("activo").optional().isBoolean().withMessage("activo debe ser booleano").toBoolean()];

const camposComunes = [
  body("numero").isInt({ min: 1 }).withMessage("numero debe ser un entero positivo").toInt(),
  body("nombre").isString().trim().isLength({ min: 3, max: 100 }).withMessage("nombre debe tener entre 3 y 100 caracteres"),
  body("descripcion").optional().isString().trim().isLength({ max: 255 }).withMessage("descripcion no puede superar 255 caracteres"),
  body("categoria").isString().trim().isLength({ min: 2, max: 50 }).withMessage("categoria debe tener entre 2 y 50 caracteres"),
  body("tarifas").isArray({ min: 1 }).withMessage("tarifas debe ser un arreglo con al menos un elemento"),
  body("tarifas.*.tipoVehiculo").isIn(TIPOS_VEHICULO).withMessage(`tipoVehiculo de cada tarifa debe ser uno de: ${TIPOS_VEHICULO.join(", ")}`),
  body("tarifas.*.valor").isInt({ min: 1000, max: 1000000 }).withMessage("el valor de cada tarifa debe estar entre 1.000 y 1.000.000").toInt(),
];

const crear = [...camposComunes];
const actualizar = [...camposComunes, body("activo").optional().isBoolean().withMessage("activo debe ser booleano").toBoolean()];

module.exports = { idValido, filtrosListado, crear, actualizar };