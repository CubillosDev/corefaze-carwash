import { Alerta } from '@/components/ui/Alerta';
import { Tabla } from '@/components/ui/Tabla';
import { formatoFecha } from '@/utils/formatoFecha';
import { formatoMoneda } from '@/utils/formatoMoneda';
import { formatoPlaca } from '@/utils/formatoPlaca';

/*
 * Datos FICTICIOS, solo para revisar el layout y los formatos. No vienen de la
 * API ni del prototipo de diseño, y se reemplazan cuando el tablero de inicio
 * consuma la API.
 */
const RESUMEN_FICTICIO = [
  { id: 'ordenes', titulo: 'Órdenes del día', valor: '12' },
  { id: 'ingresos', titulo: 'Ingresos del día', valor: formatoMoneda(450000) },
  { id: 'promedio', titulo: 'Valor promedio', valor: formatoMoneda(37500) },
];

const ORDENES_FICTICIAS = [
  { id: 1, placa: 'AAA111', servicio: 'Lavado general', fecha: '2026-08-03', valor: 30000 },
  { id: 2, placa: 'BBB22B', servicio: 'Lavado y encerado', fecha: '2026-08-03', valor: 41000 },
  { id: 3, placa: 'CCC333', servicio: 'Aspirado interior', fecha: '2026-08-02', valor: 12500 },
];

const COLUMNAS = [
  { clave: 'placa', titulo: 'Placa', render: (fila) => formatoPlaca(fila.placa) },
  { clave: 'servicio', titulo: 'Servicio' },
  { clave: 'fecha', titulo: 'Fecha', render: (fila) => formatoFecha(fila.fecha) },
  {
    clave: 'valor',
    titulo: 'Valor',
    alineacion: 'derecha',
    render: (fila) => formatoMoneda(fila.valor),
  },
];

/** Página de entrada del panel, con datos ficticios hasta que exista el tablero real. */
export function InicioPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-titulo text-neutro-900">Panel de gestión</h1>
        <p className="text-detalle text-neutro-600">
          Armazón del panel web de Car Wash: barra lateral, encabezado y área de contenido.
        </p>
      </header>

      <Alerta tipo="info" titulo="Página de ejemplo">
        Todos los datos de esta página son ficticios: sirven para revisar el layout y los formatos.
        El tablero real se conectará a la API.
      </Alerta>

      <section className="flex flex-col gap-3">
        <h2 className="text-titulo-tarjeta text-neutro-900">Resumen del día (ejemplo)</h2>
        <div className="grid gap-4 escritorio:grid-cols-3">
          {RESUMEN_FICTICIO.map((tarjeta) => (
            <article
              key={tarjeta.id}
              className="flex flex-col gap-1 rounded-tarjeta border border-neutro-200 bg-white p-5"
            >
              <p className="text-detalle text-neutro-600">{tarjeta.titulo}</p>
              <p className="text-indicador text-neutro-900">{tarjeta.valor}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-titulo-tarjeta text-neutro-900">Últimas órdenes (ejemplo)</h2>
        <Tabla
          columnas={COLUMNAS}
          filas={ORDENES_FICTICIAS}
          descripcion="Órdenes de lavado ficticias con placa, servicio, fecha y valor"
        />
      </section>
    </div>
  );
}
