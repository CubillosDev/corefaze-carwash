const { body, param, query } = require("express-validator");
const { MEDIOS_PAGO, ESTADOS_ORDEN } = require("../constants/dominio");

const hoyISO = () => new Date().toISOString().slice(0, 10);

const idValido = [param("id").isInt({ min: 1 }).withMessage("El id debe ser un entero positivo").toInt()];
const filtrosListado = [query("fecha").optional().isISO8601().withMessage("fecha debe tener formato YYYY-MM-DD")];

const camposComunes = [
  body("fecha").isISO8601().withMessage("fecha debe tener formato YYYY-MM-DD")
    .custom((valor) => valor <= hoyISO()).withMessage("fecha no puede ser futura"),
  body("turno").isInt({ min: 1 }).withMessage("turno debe ser un entero mayor o igual a 1").toInt(),
  body("vehiculoId").isInt({ min: 1 }).withMessage("vehiculoId debe ser un entero positivo").toInt(),
  body("servicioId").isInt({ min: 1 }).withMessage("servicioId debe ser un entero positivo").toInt(),
  body("colaboradorId").isInt({ min: 1 }).withMessage("colaboradorId debe ser un entero positivo").toInt(),
  body("medioPago").isIn(MEDIOS_PAGO).withMessage(`medioPago debe ser uno de: ${MEDIOS_PAGO.join(", ")}`),
  body("clienteId").optional({ nullable: true }).isInt({ min: 1 }).withMessage("clienteId debe ser un entero positivo").toInt(),
  body("autorizaMotor").optional().isBoolean().withMessage("autorizaMotor debe ser booleano").toBoolean(),
  body("observaciones").optional().isString().trim().isLength({ max: 255 }).withMessage("observaciones no puede superar 255 caracteres"),
];

// valor, estado y creadoEn NO se declaran aqui a proposito: matchedData()
// los descarta antes de llegar al service (mass assignment / R4).
const crear = [...camposComunes];
const actualizar = [...camposComunes];
const cambiarEstado = [body("estado").isIn(ESTADOS_ORDEN).withMessage(`estado debe ser uno de: ${ESTADOS_ORDEN.join(", ")}`)];

module.exports = { idValido, filtrosListado, crear, actualizar, cambiarEstado };