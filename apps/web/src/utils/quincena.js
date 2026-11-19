import { sumarDias } from '@/utils/aritmeticaFechas';

/**
 * Quincena que contiene la fecha: del 1 al 15 o del 16 a fin de mes. Es la
 * misma regla de limites_quincena() en la base de datos; la API rechaza
 * cualquier otro periodo.
 *
 * @param {string} fecha YYYY-MM-DD
 * @returns {{ inicio: string, fin: string }}
 */
export function quincenaDe(fecha) {
  const mes = fecha.slice(0, 8);
  if (Number(fecha.slice(8, 10)) <= 15) {
    return { inicio: `${mes}01`, fin: `${mes}15` };
  }
  const primeroDelSiguiente = sumarDias(`${mes}28`, 4).slice(0, 8);
  return { inicio: `${mes}16`, fin: sumarDias(`${primeroDelSiguiente}01`, -1) };
}

/**
 * @param {{ inicio: string }} quincena
 * @returns {{ inicio: string, fin: string }} La quincena inmediatamente anterior.
 */
export function quincenaAnterior({ inicio }) {
  return quincenaDe(sumarDias(inicio, -1));
}
