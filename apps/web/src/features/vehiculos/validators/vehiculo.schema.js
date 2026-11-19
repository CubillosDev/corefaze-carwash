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
 * ¿El vehículo que se edita ya tenía un valor en este campo?
 *
 * @param {{ marca?: string|null, color?: string|null }|null} anterior
 * @param {'marca'|'color'} campo
 */
export function tieneValorAnterior(anterior, campo) {
  return String(anterior?.[campo] ?? '').trim() !== '';
}

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
 * Marca y color vacíos nunca se envían. Al editar, una marca o un color que el
 * vehículo ya tenía no se pueden dejar vacíos: la API ignora el valor vacío y
 * conserva el anterior, así que el panel diría "actualizado" sin haber borrado
 * nada. Si algún día la API acepta borrarlos, se quita esa regla.
 *
 * @param {{ placa?: string, tipoVehiculo?: string, marca?: string, color?: string, clienteId?: string|number }} valores
 * @param {{ anterior?: { marca?: string|null, color?: string|null }|null }} [opciones]
 *   `anterior` es el vehículo que se está editando; null o ausente al registrar.
 * @returns {{ valido: boolean, errores: Record<string, string>, datos: object }}
 */
export function validarVehiculo(valores, { anterior = null } = {}) {
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

  for (const [campo, valor, nombre, mensajeNoBorrar] of [
    ['marca', marca, 'La marca', 'La marca no se puede borrar. Escribe la correcta.'],
    ['color', color, 'El color', 'El color no se puede borrar. Escribe el correcto.'],
  ]) {
    const { min, max } = LIMITES.marcaColor;
    if (valor === '') {
      if (tieneValorAnterior(anterior, campo)) {
        errores[campo] = mensajeNoBorrar;
      }
    } else if (valor.length < min || valor.length > max) {
      errores[campo] = `${nombre} debe tener entre ${min} y ${max} caracteres.`;
    }
  }

  if (!Number.isInteger(clienteId) || clienteId < 1) {
    errores.clienteId = 'Elige el cliente dueño del vehículo.';
  }

  const datos = { placa, tipoVehiculo, clienteId };
  if (marca !== '') {
    datos.marca = marca;
  }
  if (color !== '') {
    datos.color = color;
  }

  return { valido: Object.keys(errores).length === 0, errores, datos };
}
