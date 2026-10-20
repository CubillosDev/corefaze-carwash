import { normalizarEspacios } from '@/utils/normalizarEspacios';

const ZONA_BOGOTA = 'America/Bogota';

/** Colombia no aplica horario de verano: el desfase es fijo. */
const DESFASE_BOGOTA = '-05:00';

/** Una fecha ISO sin hora: 2026-08-03. */
const PATRON_FECHA_ISO = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

const FORMATEADOR_FECHA = new Intl.DateTimeFormat('es-CO', {
  timeZone: ZONA_BOGOTA,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const FORMATEADOR_HORA = new Intl.DateTimeFormat('es-CO', {
  timeZone: ZONA_BOGOTA,
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

/**
 * Convierte el valor recibido en un Date válido, o null si no se puede.
 *
 * @param {Date|number|string|null|undefined} valor
 * @returns {Date|null}
 */
function aFecha(valor) {
  if (valor instanceof Date) {
    return Number.isNaN(valor.getTime()) ? null : valor;
  }

  if (typeof valor === 'number') {
    const desdeMarcaDeTiempo = new Date(valor);
    return Number.isNaN(desdeMarcaDeTiempo.getTime()) ? null : desdeMarcaDeTiempo;
  }

  if (typeof valor !== 'string') {
    return null;
  }

  const texto = valor.trim();
  if (texto === '') {
    return null;
  }

  // Una fecha sin hora se ancla al inicio del día en Bogotá. Sin el desfase,
  // new Date('2026-08-03') la lee como medianoche UTC y en Colombia (UTC-5)
  // terminaría mostrando el día anterior.
  const iso = PATRON_FECHA_ISO.test(texto) ? `${texto}T00:00:00${DESFASE_BOGOTA}` : texto;

  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

/**
 * Formatea una fecha como dd/mm/aaaa en la zona horaria de Bogotá.
 *
 *   formatoFecha('2026-08-03') -> "03/08/2026"
 *
 * Una fecha ISO sin hora se descompone por partes y nunca pasa por Date, así
 * que no depende de la zona horaria del equipo ni del servidor de pruebas.
 *
 * @param {Date|number|string|null|undefined} valor
 * @returns {string} Cadena vacía si el valor no es una fecha utilizable.
 */
export function formatoFecha(valor) {
  if (typeof valor === 'string') {
    const partes = PATRON_FECHA_ISO.exec(valor.trim());
    if (partes) {
      const [, anio, mes, dia] = partes;
      return `${dia}/${mes}/${anio}`;
    }
  }

  const fecha = aFecha(valor);
  return fecha === null ? '' : FORMATEADOR_FECHA.format(fecha);
}

/**
 * Formatea fecha y hora en la zona horaria de Bogotá, con reloj de 12 horas.
 *
 *   formatoFechaHora('2026-08-03T14:30:00-05:00') -> "03/08/2026 2:30 p. m."
 *
 * Una fecha sin hora se muestra como la medianoche de ese día en Bogotá.
 *
 * @param {Date|number|string|null|undefined} valor
 * @returns {string} Cadena vacía si el valor no es una fecha utilizable.
 */
export function formatoFechaHora(valor) {
  const fecha = aFecha(valor);
  if (fecha === null) {
    return '';
  }

  const hora = normalizarEspacios(FORMATEADOR_HORA.format(fecha));
  return `${FORMATEADOR_FECHA.format(fecha)} ${hora}`;
}
