import { Alerta } from '@/components/ui/Alerta';
import { Tabla } from '@/components/ui/Tabla';
import { formatoFecha } from '@/utils/formatoFecha';
import { formatoMoneda } from '@/utils/formatoMoneda';

/** Datos de muestra: se reemplazan cuando la página consuma la API. */
const RESUMEN_DE_EJEMPLO = [
  { id: 'ordenes', titulo: 'Órdenes del día', valor: '12' },
  { id: 'ingresos', titulo: 'Ingresos del día', valor: formatoMoneda(428000) },
  { id: 'promedio', titulo: 'Valor promedio', valor: formatoMoneda(35667) },
];

/** Datos de muestra: se reemplazan cuando la página consuma la API. */
const ORDENES_DE_EJEMPLO = [
  { id: 1, placa: 'ABC123', servicio: 'Lavado general', fecha: '2026-08-03', valor: 28000 },
  { id: 2, placa: 'XYZ45D', servicio: 'Lavado y encerado', fecha: '2026-08-03', valor: 65000 },
  { id: 3, placa: 'JKL789', servicio: 'Aspirado interior', fecha: '2026-08-02', valor: 18000 },
];

const COLUMNAS = [
  { clave: 'placa', titulo: 'Placa' },
  { clave: 'servicio', titulo: 'Servicio' },
  { clave: 'fecha', titulo: 'Fecha', render: (fila) => formatoFecha(fila.fecha) },
  {
    clave: 'valor',
    titulo: 'Valor',
    alineacion: 'derecha',
    render: (fila) => formatoMoneda(fila.valor),
  },
];

/** Página de entrada del panel. */
export function InicioPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-neutro-900">Panel de gestión</h1>
        <p className="text-sm text-neutro-600">
          Armazón del panel web de Car Wash: barra lateral, encabezado y área de contenido.
        </p>
      </header>

      <Alerta tipo="info" titulo="Fundación técnica">
        Las secciones del negocio se conectan en los siguientes bloques. Lo que ves aquí son datos
        de muestra para revisar el layout y los formatos.
      </Alerta>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <h2 className="sr-only">Resumen de ejemplo</h2>
        {RESUMEN_DE_EJEMPLO.map((tarjeta) => (
          <article
            key={tarjeta.id}
            className="flex flex-col gap-1 rounded-xl border border-neutro-200 bg-white p-5"
          >
            <p className="text-sm text-neutro-500">{tarjeta.titulo}</p>
            <p className="text-2xl font-semibold text-primario">{tarjeta.valor}</p>
          </article>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-neutro-900">Últimas órdenes (ejemplo)</h2>
        <Tabla
          columnas={COLUMNAS}
          filas={ORDENES_DE_EJEMPLO}
          descripcion="Órdenes de lavado de ejemplo con placa, servicio, fecha y valor"
        />
      </section>
    </div>
  );
}
