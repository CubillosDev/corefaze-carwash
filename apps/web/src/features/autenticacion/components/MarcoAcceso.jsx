import logoCorefaze from '@/assets/images/logo-corefaze.webp';
import { MarcaCorefaze } from '@/components/ui/MarcaCorefaze';
import { Punto } from '@/components/ui/Punto';
import { etiquetaEstadoOrden, tonoEstadoOrden } from '@/constants/etiquetas';
import { EscenaIngreso } from '@/features/autenticacion/components/EscenaIngreso';
import { FASES_DEL_TABLERO } from '@/utils/estadosOrden';

/**
 * Marco de las pantallas de acceso (ingreso, solicitud de acceso y cuenta en
 * aprobación). Repite el del panel: la cabecera sobre el fondo oscuro y el
 * panel claro redondeado, que aquí lleva el contenido. A la izquierda, sobre
 * el marco, la escena isométrica de la marca y los estados por los que pasa
 * una orden. En móvil el panel sube como hoja inferior.
 *
 * @param {object} props
 * @param {string} props.titulo
 * @param {string} props.descripcion
 * @param {import('react').ReactNode} props.children
 */
export function MarcoAcceso({ titulo, descripcion, children }) {
  return (
    <main className="flex min-h-dvh flex-col bg-marco">
      <header className="flex h-encabezado shrink-0 items-center gap-3.5 px-3 escritorio:px-4.5">
        {/* El logo es blanco: va sobre el marco oscuro. */}
        <img src={logoCorefaze} alt="Corefaze" className="h-6 w-auto" />
        <span aria-hidden="true" className="h-5 w-px bg-white/25" />
        <span className="text-marca text-white">CarWash</span>
      </header>

      <div className="flex flex-1 flex-col escritorio:mx-2 escritorio:mb-2 escritorio:grid escritorio:grid-cols-2 escritorio:gap-2 amplio:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section className="flex flex-col justify-end px-5 pt-4 pb-7 escritorio:px-12 escritorio:pt-6 escritorio:pb-12">
          <div className="relative hidden min-h-0 flex-1 escritorio:block">
            <EscenaIngreso className="pointer-events-none absolute inset-0 size-full" />
          </div>

          <div className="flex max-w-md flex-col">
            <p className="text-etiqueta text-primario-200 uppercase">Panel del lavadero</p>
            <p className="mt-2.5 text-portada-movil text-balance text-white escritorio:text-portada">
              Cada vehículo, de la recepción a la entrega.
            </p>
            <p className="mt-3 text-cuerpo leading-apoyo text-white/65">
              Órdenes, caja, crédito y nómina del lavadero en un solo panel.
            </p>
            <ul aria-label="Estados de una orden" className="mt-5 flex flex-wrap gap-2">
              {FASES_DEL_TABLERO.map((estado) => (
                <li
                  key={estado}
                  className="inline-flex h-7 items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 text-detalle text-white/85"
                >
                  <Punto tono={tonoEstadoOrden(estado)} />
                  {etiquetaEstadoOrden(estado)}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="flex flex-1 flex-col rounded-t-panel bg-neutro-50 px-5 pt-8 pb-5 escritorio:rounded-panel escritorio:px-10 escritorio:pt-10">
          <div className="m-auto flex w-full max-w-sm animate-entrar-modal flex-col gap-6">
            <div className="flex flex-col gap-4">
              <span className="inline-flex size-11 items-center justify-center rounded-bloque bg-linear-to-br from-primario-500 to-primario-800 shadow-boton-primario">
                <MarcaCorefaze className="size-5.5 text-white" />
              </span>
              <header className="flex flex-col gap-1.5">
                <h1 className="text-portada-movil text-neutro-900">{titulo}</h1>
                <p className="text-cuerpo text-neutro-600">{descripcion}</p>
              </header>
            </div>
            {children}
          </div>

          <p className="mt-8 text-center text-nota text-neutro-450">Corefaze · CarWash</p>
        </section>
      </div>
    </main>
  );
}
