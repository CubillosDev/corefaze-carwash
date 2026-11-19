const diasDelMes = (anio, mes) => new Date(Date.UTC(anio, mes, 0)).getUTCDate();
const dosDigitos = (numero) => String(numero).padStart(2, '0');

/**
 * Próxima fecha de corte de una cuenta de crédito: este mes si el día aún no
 * pasa, o el siguiente. El día se ajusta a meses más cortos (31 -> 30 o 28).
 * Trabaja con fechas sin hora (YYYY-MM-DD), sin zona horaria.
 *
 * @param {number} diaCorte 1 a 31.
 * @param {string} hoy YYYY-MM-DD
 * @returns {string} YYYY-MM-DD
 */
export function proximoCorte(diaCorte, hoy) {
  const [anio, mes, dia] = hoy.split('-').map(Number);
  const corteEsteMes = Math.min(diaCorte, diasDelMes(anio, mes));
  if (dia <= corteEsteMes) {
    return `${anio}-${dosDigitos(mes)}-${dosDigitos(corteEsteMes)}`;
  }
  const siguienteMes = mes === 12 ? 1 : mes + 1;
  const siguienteAnio = mes === 12 ? anio + 1 : anio;
  const corte = Math.min(diaCorte, diasDelMes(siguienteAnio, siguienteMes));
  return `${siguienteAnio}-${dosDigitos(siguienteMes)}-${dosDigitos(corte)}`;
}
