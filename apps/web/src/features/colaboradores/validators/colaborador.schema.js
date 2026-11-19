import { ESTADOS_ACTIVIDAD, LIMITES, TIPOS_VINCULACION } from '@/constants/dominio';
import { errorDeLongitud, errorDeTelefono, soloErrores } from '@/utils/validaciones';

const DIGITOS_CODIGO = LIMITES.codigoColaborador.longitud;
const CODIGO_MIN = 10 ** (DIGITOS_CODIGO - 1);
const CODIGO_MAX = 10 ** DIGITOS_CODIGO - 1;
const PORCENTAJE_MIN = LIMITES.porcentajeComision.min * 100;
const PORCENTAJE_MAX = LIMITES.porcentajeComision.max * 100;

/** Valores del formulario al registrar un colaborador. La comisión se escribe en %. */
export const VALORES_INICIALES_COLABORADOR = Object.freeze({
  codigo: '',
  nombre: '',
  documento: '',
  telefono: '',
  porcentaje: '',
  tipoVinculacion: TIPOS_VINCULACION.FIJO,
});

/** Lleva un colaborador de la API a los valores del formulario (fracción -> %). */
export const valoresDeColaborador = (colaborador) => ({
  codigo: String(colaborador.codigo),
  nombre: colaborador.nombre,
  documento: colaborador.documento,
  telefono: colaborador.telefono,
  porcentaje: String(Math.round(colaborador.porcentajeComision * 10000) / 100),
  tipoVinculacion: colaborador.tipoVinculacion,
});

/**
 * Valida el formato con los límites de dominio.json y arma el cuerpo para
 * POST o PUT /api/colaboradores. La comisión se escribe como porcentaje y se
 * envía como la fracción que pide la API (37 % -> 0.37): es solo un cambio de
 * unidad, no un cálculo. Código en uso, documento repetido y período de gracia
 * los valida la API.
 *
 * @param {typeof VALORES_INICIALES_COLABORADOR} valores
 * @returns {{ valido: boolean, errores: Record<string, string>, datos: object }}
 */
export function validarColaborador(valores) {
  const codigo = Number(valores.codigo);
  const nombre = String(valores.nombre ?? '').trim();
  const documento = String(valores.documento ?? '').trim();
  const telefono = String(valores.telefono ?? '').trim();
  const textoPorcentaje = String(valores.porcentaje ?? '').trim().replace(',', '.');
  const porcentaje = Number(textoPorcentaje);
  const porcentajeValido =
    textoPorcentaje !== '' &&
    Number.isFinite(porcentaje) &&
    porcentaje >= PORCENTAJE_MIN &&
    porcentaje <= PORCENTAJE_MAX;

  const errores = soloErrores({
    codigo:
      Number.isInteger(codigo) && codigo >= CODIGO_MIN && codigo <= CODIGO_MAX
        ? undefined
        : `El código debe tener ${DIGITOS_CODIGO} dígitos.`,
    nombre: errorDeLongitud(nombre, LIMITES.nombre, 'El nombre'),
    documento: errorDeLongitud(documento, LIMITES.documento, 'El documento'),
    telefono: errorDeTelefono(telefono, LIMITES.telefono.longitud),
    porcentaje: porcentajeValido
      ? undefined
      : `La comisión debe estar entre ${PORCENTAJE_MIN} y ${PORCENTAJE_MAX} %.`,
    tipoVinculacion: Object.values(TIPOS_VINCULACION).includes(valores.tipoVinculacion)
      ? undefined
      : 'Elige el tipo de vinculación.',
  });

  return {
    valido: Object.keys(errores).length === 0,
    errores,
    datos: {
      codigo,
      nombre,
      documento,
      telefono,
      porcentajeComision: Math.round(porcentaje * 100) / 10000,
      tipoVinculacion: valores.tipoVinculacion,
    },
  };
}

/** Estado contrario para activar o desactivar (los colaboradores no se borran). */
export const estadoContrario = (estado) =>
  estado === ESTADOS_ACTIVIDAD.ACTIVO ? ESTADOS_ACTIVIDAD.INACTIVO : ESTADOS_ACTIVIDAD.ACTIVO;
