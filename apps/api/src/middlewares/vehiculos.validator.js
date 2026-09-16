const { body, param, query } = require("express-validator");
const { TIPOS_VEHICULO } = require("../constants/dominio");

const PATRON_PLACA_CARRO = /^[A-Z]{3}[0-9]{3}$/;
const PATRON_PLACA_MOTO = /^[A-Z]{3}[0-9]{2}[A-Z]$/;

const normalizarPlaca = (valor) => (typeof valor === "string" ? valor.toUpperCase().replace(/[\s-]/g, "") : valor);

const idValido = [param("id").isInt({ min: 1 }).withMessage("El id debe ser un entero positivo").toInt()];
const filtrosListado = [query("placa").optional().customSanitizer(normalizarPlaca)];

const camposComunes = [
  body("placa").customSanitizer(normalizarPlaca)
    .custom((valor) => PATRON_PLACA_CARRO.test(valor) || PATRON_PLACA_MOTO.test(valor))
    .withMessage("placa invalida: carro ABC123, moto ABC12D"),
  body("tipoVehiculo").isIn(TIPOS_VEHICULO).withMessage(`tipoVehiculo debe ser uno de: ${TIPOS_VEHICULO.join(", ")}`),
  body("marca").optional().isString().trim().isLength({ min: 2, max: 30 }).withMessage("marca debe tener entre 2 y 30 caracteres"),
  body("color").optional().isString().trim().isLength({ min: 2, max: 30 }).withMessage("color debe tener entre 2 y 30 caracteres"),
  body("clienteId").optional({ nullable: true }).isInt({ min: 1 }).withMessage("clienteId debe ser un entero positivo").toInt(),
];

const crear = [...camposComunes];
const actualizar = [...camposComunes];

module.exports = { idValido, filtrosListado, crear, actualizar };