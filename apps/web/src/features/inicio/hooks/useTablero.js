import { ESTADOS_JORNADA } from '@/constants/dominio';
import { obtenerEstadoCaja } from '@/features/caja';
import { listarInsumos } from '@/features/inventario';
import { listarJornadas } from '@/features/jornadas';
import { listarOrdenes } from '@/features/ordenes-lavado';
import { obtenerIngresosPorHora } from '@/features/reportes';
import { useCarga } from '@/hooks/useCarga';
import { sumarDias } from '@/utils/aritmeticaFechas';
import { curvaAcumulada } from '@/utils/curvaAcumulada';
import { fechaEnBogota, formatoFecha, horaDelDiaEnBogota } from '@/utils/formatoFecha';

/**
 * La caja, la curva y el inventario acompañan al tablero: si alguno falla, el
 * tablero se muestra igual y esa parte lo dice.
 */
const opcional = (promesa) => promesa.catch(() => null);

/** "ayer" si la jornada anterior fue el día antes; si no, su fecha corta. */
function nombreDeLaAnterior(fecha, fechaAnterior) {
  return fechaAnterior === sumarDias(fecha, -1) ? 'ayer' : `el ${formatoFecha(fechaAnterior).slice(0, 5)}`;
}

/** La curva de la jornada, cortada en la hora de la carga si la jornada es de hoy. */
function prepararCurva(datos, ahora) {
  if (!datos) {
    return null;
  }
  const deHoy = datos.fecha === fechaEnBogota(ahora);
  return {
    ...curvaAcumulada({
      horas: datos.horas,
      horasAnteriores: datos.anterior?.horas ?? null,
      horaActual: deHoy ? horaDelDiaEnBogota(ahora) : 23,
    }),
    etiquetaAnterior: datos.anterior ? nombreDeLaAnterior(datos.fecha, datos.anterior.fecha) : '',
  };
}

async function cargarTablero(signal) {
  const ahora = new Date();
  const [jornadas, caja, insumos] = await Promise.all([
    listarJornadas({}, { signal }),
    opcional(obtenerEstadoCaja({}, { signal })),
    opcional(listarInsumos({ signal })),
  ]);
  const jornada = jornadas.find((candidata) => candidata.estado === ESTADOS_JORNADA.ABIERTA) ?? null;
  const base = { jornada, caja, insumos, cargadoEn: ahora.getTime() };
  if (!jornada) {
    return { ...base, ordenes: [], totales: null, curva: null };
  }
  const [{ ordenes, totales }, curva] = await Promise.all([
    listarOrdenes({ jornadaId: jornada.id }, { signal }),
    opcional(obtenerIngresosPorHora(jornada.fecha, { signal })),
  ]);
  return { ...base, ordenes, totales, curva: prepararCurva(curva, ahora) };
}

/**
 * Datos del tablero de inicio: la jornada abierta (si la hay) con sus órdenes
 * y los totales que calcula el servidor, la curva de ingresos por hora frente
 * a la jornada anterior, el estado de la caja (por cobrar y en patio) y los
 * insumos (para el aviso de stock bajo).
 */
export function useTablero() {
  return useCarga(cargarTablero);
}
