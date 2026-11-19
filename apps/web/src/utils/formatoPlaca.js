import { PATRONES_PLACA } from '@/constants/dominio';

/**
 * Formatea una placa para mostrarla, separando las letras del resto.
 *
 *   formatoPlaca('ABC123')  -> "ABC 123"   (carro)
 *   formatoPlaca('abc-12d') -> "ABC 12D"   (moto)
 *
 * Antes de formatear se normaliza como lo exige el dominio: mayúsculas, sin
 * espacios ni guiones. Si el resultado no cumple el patrón de carro ni el de
 * moto (packages/contratos/dominio.json), se devuelve normalizado y sin separar.
 *
 * @param {string|null|undefined} valor
 * @returns {string} Cadena vacía si no hay placa.
 */
export function formatoPlaca(valor) {
  const placa = String(valor ?? '')
    .toUpperCase()
    .replace(/[\s-]/g, '');

  if (PATRONES_PLACA.CARRO.test(placa) || PATRONES_PLACA.MOTO.test(placa)) {
    return `${placa.slice(0, 3)} ${placa.slice(3)}`;
  }
  return placa;
}
