const { body } = require('express-validator');
const { LIMITES, TIPOS_VEHICULO } = require('../constants/dominio');

/** Mismo criterio que tieneTipoVehiculoDuplicado en servicios.service.js. */
const tieneTipoVehiculoDuplicado = (tarifas) => {
  const tipos = tarifas.map((tarifa) => tarifa.tipoVehiculo);
  return new Set(tipos).size !== tipos.length;
};

const validarNumero = () =>
  body('numero').isInt({ min: 1 }).withMessage('El número debe ser un entero positivo').toInt();

const validarNombre = () =>
  body('nombre')
    .isString()
    .withMessage('El nombre debe ser texto')
    .bail()
    .trim()
    .isLength({ min: LIMITES.nombre.min, max: LIMITES.nombre.max })
    .withMessage(
      `El nombre debe tener entre ${LIMITES.nombre.min} y ${LIMITES.nombre.max} caracteres`,
    );

const validarDescripcion = () =>
  body('descripcion')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('La descripción debe ser texto')
    .bail()
    .trim()
    .isLength({ max: LIMITES.observaciones.max })
    .withMessage(`La descripción no puede superar los ${LIMITES.observaciones.max} caracteres`);

const validarCategoria = () =>
  body('categoria')
    .optional()
    .isString()
    .withMessage('La categoría debe ser texto')
    .bail()
    .trim()
    .isLength({ min: LIMITES.nombre.min, max: LIMITES.nombre.max })
    .withMessage(
      `La categoría debe tener entre ${LIMITES.nombre.min} y ${LIMITES.nombre.max} caracteres`,
    );

const validarArregloDeTarifas = () =>
  body('tarifas')
    .isArray({ min: 1 })
    .withMessage('Debe incluir al menos una tarifa')
    .bail()
    .custom((tarifas) => !tieneTipoVehiculoDuplicado(tarifas))
    .withMessage('No puede haber dos tarifas para el mismo tipo de vehículo');

const validarTipoVehiculoDeTarifa = () =>
  body('tarifas.*.tipoVehiculo')
    .isIn(Object.values(TIPOS_VEHICULO))
    .withMessage(`tipoVehiculo debe ser uno de: ${Object.values(TIPOS_VEHICULO).join(', ')}`);

const validarValorDeTarifa = () =>
  body('tarifas.*.valor')
    .isInt({ min: LIMITES.tarifa.min, max: LIMITES.tarifa.max })
    .withMessage(
      `El valor de la tarifa debe ser un entero entre ${LIMITES.tarifa.min} y ${LIMITES.tarifa.max}`,
    )
    .toInt();

const validarActivo = () =>
  body('activo')
    .optional()
    .isBoolean()
    .withMessage('activo debe ser verdadero o falso')
    .toBoolean();

/** POST /api/servicios: todos los campos obligatorios son requeridos (activo no está en el contrato). */
const validarCrear = [
  validarNumero(),
  validarNombre(),
  validarDescripcion(),
  validarCategoria(),
  validarArregloDeTarifas(),
  validarTipoVehiculoDeTarifa(),
  validarValorDeTarifa(),
];

/** PUT /api/servicios/:id: cada campo es opcional, se actualiza lo que se envíe. */
const validarActualizar = [
  validarNumero().optional(),
  validarNombre().optional(),
  validarDescripcion(),
  validarCategoria(),
  validarArregloDeTarifas().optional(),
  validarTipoVehiculoDeTarifa(),
  validarValorDeTarifa(),
  validarActivo(),
];

module.exports = { validarCrear, validarActualizar };
