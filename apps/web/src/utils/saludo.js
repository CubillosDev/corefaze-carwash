import { horaDelDiaEnBogota } from '@/utils/formatoFecha';

/**
 * Saludo según la hora de Bogotá, como en el panel de jornada del diseño:
 * antes de las 12 "Buenos días", antes de las 19 "Buenas tardes" y después
 * "Buenas noches".
 *
 * @param {Date|number|string} momento
 * @returns {string}
 */
export function saludoSegunHora(momento) {
  const hora = horaDelDiaEnBogota(momento) ?? 12;
  if (hora < 12) {
    return 'Buenos días';
  }
  return hora < 19 ? 'Buenas tardes' : 'Buenas noches';
}
