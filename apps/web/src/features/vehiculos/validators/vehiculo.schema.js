import { LIMITES, PATRONES_PLACA, TIPOS_VEHICULO, TIPOS_VEHICULO_MOTO } from '@/constants/dominio';

/**
 * Deja una placa como la guarda la API: mayúsculas, sin espacios ni guiones.
 *
 *   normalizarPlaca(' abc-123 ') -> "ABC123"
 *
 * @param {string|null|undefined} valor
 */
export function normalizarPlaca(valor) {
  return String(valor ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

const esMoto = (tipoVehiculo) => TIPOS_VEHICULO_MOTO.includes(tipoVehiculo);

/**
 * Valida el formulario de vehículo. Es solo una ayuda para quien escribe: la
 * API vuelve a validar todo (formato, correspondencia placa-tipo, unicidad).
 *
 * Reglas (espejo de apps/api/src/middlewares/vehiculos.validator.js):
 * - placa: ABC123 (carro) o ABC12D (moto), y debe corresponder al tipo.
 * - tipoVehiculo: uno de los del contrato.
 * - marca y color: opcionales; si se escriben, entre 2 y 30 caracteres.
 * - clienteId: obligatorio (la API lo exige).
 *
 * En modo "crear" la marca y el color vacíos no se envían; en modo "editar" se
 * envían vacíos para que se pueda borrar un valor anterior.
 *
 * @param {{ placa?: string, tipoVehiculo?: string, marca?: string, color?: string, clienteId?: string|number }} valores
 * @param {{ modo?: 'crear'|'editar' }} [opciones]
 * @returns {{ valido: boolean, errores: Record<string, string>, datos: object }}
 */
export function validarVehiculo(valores, { modo = 'crear' } = {}) {
  const placa = normalizarPlaca(valores.placa);
  const tipoVehiculo = valores.tipoVehiculo ?? '';
  const marca = String(valores.marca ?? '').trim();
  const color = String(valores.color ?? '').trim();
  const clienteId = Number(valores.clienteId);
  const errores = {};

  const tipoValido = Object.values(TIPOS_VEHICULO).includes(tipoVehiculo);
  if (!tipoValido) {
    errores.tipoVehiculo = 'Elige el tipo de vehículo.';
  }

  const formatoValido = PATRONES_PLACA.CARRO.test(placa) || PATRONES_PLACA.MOTO.test(placa);
  if (placa === '') {
    errores.placa = 'Escribe la placa.';
  } else if (!formatoValido) {
    errores.placa = 'La placa debe tener el formato ABC123 (carro) o ABC12D (moto).';
  } else if (tipoValido) {
    const patronEsperado = esMoto(tipoVehiculo) ? PATRONES_PLACA.MOTO : PATRONES_PLACA.CARRO;
    if (!patronEsperado.test(placa)) {
      errores.placa = `La placa no corresponde al formato de ${esMoto(tipoVehiculo) ? 'moto' : 'carro'}.`;
    }
  }

  for (const [campo, valor, nombre] of [
    ['marca', marca, 'La marca'],
    ['color', color, 'El color'],
  ]) {
    const { min, max } = LIMITES.marcaColor;
    if (valor !== '' && (valor.length < min || valor.length > max)) {
      errores[campo] = `${nombre} debe tener entre ${min} y ${max} caracteres.`;
    }
  }

  if (!Number.isInteger(clienteId) || clienteId < 1) {
    errores.clienteId = 'Elige el cliente dueño del vehículo.';
  }

  const datos = { placa, tipoVehiculo, clienteId };
  if (modo === 'editar' || marca !== '') {
    datos.marca = marca;
  }
  if (modo === 'editar' || color !== '') {
    datos.color = color;
  }

  return { valido: Object.keys(errores).length === 0, errores, datos };
}
