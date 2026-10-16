const { body } = require('express-validator');
const { LIMITES, ESTADOS_ACTIVIDAD, TIPOS_VINCULACION } = require('../constants/dominio');

const CODIGO_MIN = 10 ** (LIMITES.codigoColaborador.longitud - 1);
const CODIGO_MAX = 10 ** LIMITES.codigoColaborador.longitud - 1;

const validarCodigo = () =>
  body('codigo')
    .isInt({ min: CODIGO_MIN, max: CODIGO_MAX })
    .withMessage(
      `El código debe ser un número entero de ${LIMITES.codigoColaborador.longitud} dígitos (entre ${CODIGO_MIN} y ${CODIGO_MAX})`,
    )
    .toInt();

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

const validarDocumento = () =>
  body('documento')
    .isString()
    .withMessage('El documento debe ser texto')
    .bail()
    .trim()
    .isLength({ min: LIMITES.documento.min, max: LIMITES.documento.max })
    .withMessage(
      `El documento debe tener entre ${LIMITES.documento.min} y ${LIMITES.documento.max} caracteres`,
    );

const validarTelefono = () =>
  body('telefono')
    .isString()
    .withMessage('El teléfono debe ser texto')
    .bail()
    .isLength({ min: LIMITES.telefono.longitud, max: LIMITES.telefono.longitud })
    .withMessage(`El teléfono debe tener exactamente ${LIMITES.telefono.longitud} dígitos`)
    .bail()
    .isNumeric()
    .withMessage('El teléfono debe contener solo dígitos');

const validarPorcentajeComision = () =>
  body('porcentajeComision')
    .isFloat({ min: LIMITES.porcentajeComision.min, max: LIMITES.porcentajeComision.max })
    .withMessage(
      `porcentajeComision debe ser un número entre ${LIMITES.porcentajeComision.min} y ${LIMITES.porcentajeComision.max}`,
    )
    .toFloat();

const validarTipoVinculacion = () =>
  body('tipoVinculacion')
    .isIn(Object.values(TIPOS_VINCULACION))
    .withMessage(`tipoVinculacion debe ser uno de: ${Object.values(TIPOS_VINCULACION).join(', ')}`);

const validarEstado = () =>
  body('estado')
    .optional()
    .isIn(Object.values(ESTADOS_ACTIVIDAD))
    .withMessage(`El estado debe ser uno de: ${Object.values(ESTADOS_ACTIVIDAD).join(', ')}`);

/**
 * POST /api/colaboradores: todos los campos son obligatorios.
 * estado no forma parte del contrato de creación: el service siempre
 * lo fija en "activo", el cliente no lo controla aquí.
 */
const validarCrear = [
  validarCodigo(),
  validarNombre(),
  validarDocumento(),
  validarTelefono(),
  validarPorcentajeComision(),
  validarTipoVinculacion(),
];

/** PUT /api/colaboradores/:id: cada campo es opcional, se actualiza lo que se envíe. */
const validarActualizar = [
  validarCodigo().optional(),
  validarNombre().optional(),
  validarDocumento().optional(),
  validarTelefono().optional(),
  validarPorcentajeComision().optional(),
  validarTipoVinculacion().optional(),
  validarEstado(),
];

module.exports = { validarCrear, validarActualizar };
