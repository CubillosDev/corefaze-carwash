import { IconoCargando } from '@/components/ui/iconos/IconoCargando';

const ESTILOS_BASE = [
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap',
  'transition-colors duration-150 select-none',
  'focus-visible:outline-2 focus-visible:outline-offset-2',
  'disabled:cursor-not-allowed disabled:opacity-60',
].join(' ');

const ESTILOS_POR_VARIANTE = {
  primario: [
    'bg-primario text-white',
    'hover:not-disabled:bg-primario-600 active:not-disabled:bg-primario-900',
    'focus-visible:outline-primario-400',
  ].join(' '),
  secundario: [
    'bg-white text-primario ring-1 ring-neutro-300 ring-inset',
    'hover:not-disabled:bg-primario-50 hover:not-disabled:ring-primario-200',
    'active:not-disabled:bg-primario-100',
    'focus-visible:outline-primario-400',
  ].join(' '),
  peligro: [
    'bg-acento text-white',
    'hover:not-disabled:bg-acento-600 active:not-disabled:bg-acento-700',
    'focus-visible:outline-acento-300',
  ].join(' '),
  fantasma: [
    'bg-transparent text-primario',
    'hover:not-disabled:bg-primario-50 active:not-disabled:bg-primario-100',
    'focus-visible:outline-primario-400',
  ].join(' '),
};

const ESTILOS_POR_TAMANO = {
  pequeno: 'h-8 px-3 text-sm',
  mediano: 'h-10 px-4 text-sm',
  grande: 'h-12 px-6 text-base',
};

/**
 * Botón del sistema de diseño.
 *
 * Mientras `cargando` sea verdadero el botón queda deshabilitado y muestra un
 * indicador de progreso, para que no se pueda enviar dos veces la misma acción.
 *
 * @param {object} props
 * @param {'primario'|'secundario'|'peligro'|'fantasma'} [props.variante]
 * @param {'pequeno'|'mediano'|'grande'} [props.tamano]
 * @param {boolean} [props.cargando]
 * @param {boolean} [props.disabled]
 * @param {string} [props.className] Clases extra de posicionamiento o ancho.
 * @param {import('react').ReactNode} props.children
 */
export function Boton({
  variante = 'primario',
  tamano = 'mediano',
  cargando = false,
  disabled = false,
  className = '',
  children,
  ...resto
}) {
  const clases = [
    ESTILOS_BASE,
    ESTILOS_POR_VARIANTE[variante] ?? ESTILOS_POR_VARIANTE.primario,
    ESTILOS_POR_TAMANO[tamano] ?? ESTILOS_POR_TAMANO.mediano,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      {...resto}
      className={clases}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
    >
      {cargando ? <IconoCargando /> : null}
      {children}
    </button>
  );
}
