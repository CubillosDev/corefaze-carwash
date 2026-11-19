import { Boton } from '@/components/ui/Boton';
import { Insignia } from '@/components/ui/Insignia';
import { Tabla } from '@/components/ui/Tabla';
import { ESTADOS_JORNADA } from '@/constants/dominio';
import { etiquetaEstadoJornada } from '@/constants/etiquetas';
import { formatoFecha, formatoFechaHora } from '@/utils/formatoFecha';
import { formatoMoneda } from '@/utils/formatoMoneda';

/**
 * Jornadas con sus totales (unidades y venta los calcula el servidor) y las
 * acciones que el rol puede usar: cerrar la abierta y reabrir una cerrada.
 *
 * @param {object} props
 * @param {object[]} props.jornadas
 * @param {boolean} props.puedeCerrar
 * @param {boolean} props.puedeReabrir
 * @param {boolean} props.enviando
 * @param {(jornada: object) => void} props.alCerrar
 * @param {(jornada: object) => void} props.alReabrir
 */
export function TablaJornadas({ jornadas, puedeCerrar, puedeReabrir, enviando, alCerrar, alReabrir }) {
  const columnas = [
    {
      clave: 'fecha',
      titulo: 'Fecha',
      render: (jornada) => <span className="font-semibold tabular-nums">{formatoFecha(jornada.fecha)}</span>,
    },
    {
      clave: 'estado',
      titulo: 'Estado',
      render: (jornada) => (
        <Insignia tono={jornada.estado === ESTADOS_JORNADA.ABIERTA ? 'exito' : 'neutro'}>
          {etiquetaEstadoJornada(jornada.estado)}
        </Insignia>
      ),
    },
    {
      clave: 'abiertaEn',
      titulo: 'Apertura',
      render: (jornada) => <span className="text-neutro-650">{formatoFechaHora(jornada.abiertaEn)}</span>,
    },
    {
      clave: 'cerradaEn',
      titulo: 'Cierre',
      render: (jornada) => (
        <span className="text-neutro-650">
          {jornada.estado === ESTADOS_JORNADA.CERRADA && jornada.cerradaEn
            ? formatoFechaHora(jornada.cerradaEn)
            : '—'}
        </span>
      ),
    },
    {
      clave: 'reaperturas',
      titulo: 'Reaperturas',
      alineacion: 'centro',
      render: (jornada) => <span className="tabular-nums">{jornada.reaperturas?.length ?? 0}</span>,
    },
    {
      clave: 'unidades',
      titulo: 'Servicios',
      alineacion: 'centro',
      render: (jornada) => <span className="tabular-nums">{jornada.unidades ?? 0}</span>,
    },
    {
      clave: 'ventaTotal',
      titulo: 'Venta',
      alineacion: 'derecha',
      render: (jornada) => <span className="font-semibold tabular-nums">{formatoMoneda(jornada.ventaTotal ?? 0)}</span>,
    },
    {
      clave: 'acciones',
      titulo: 'Acciones',
      alineacion: 'derecha',
      render: (jornada) => {
        if (jornada.estado === ESTADOS_JORNADA.ABIERTA && puedeCerrar) {
          return (
            <Boton variante="secundario" tamano="pequeno" disabled={enviando} onClick={() => alCerrar(jornada)}>
              Cerrar
            </Boton>
          );
        }
        if (jornada.estado === ESTADOS_JORNADA.CERRADA && puedeReabrir) {
          return (
            <Boton variante="fantasma" tamano="pequeno" disabled={enviando} onClick={() => alReabrir(jornada)}>
              Reabrir
            </Boton>
          );
        }
        return null;
      },
    },
  ];

  return (
    <Tabla
      columnas={columnas}
      filas={jornadas}
      descripcion="Jornadas registradas, de la más reciente a la más antigua"
      mensajeVacio="Aún no hay jornadas registradas."
    />
  );
}
