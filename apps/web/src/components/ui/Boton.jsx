import { IconoCargando } from '@/components/ui/iconos/IconoCargando';

const ESTILOS_BASE = [
  'inline-flex shrink-0 items-center justify-center gap-1.75 font-semibold whitespace-nowrap',
  'transition-[color,background-color,box-shadow,transform] select-none',
  'focus-visible:outline-2 focus-visible:outline-offset-2',
  'disabled:cursor-not-allowed',
].join(' ');

const ESTILOS_POR_VARIANTE = {
  primario: [
    'bg-primario text-white duration-150',
    'hover:not-disabled:bg-primario-600 active:not-disabled:scale-97',
    'disabled:bg-primario-300',
    'focus-visible:outline-primario',
  ].join(' '),
  secundario: [
    'bg-white text-neutro-900 ring-1 ring-neutro-300 ring-inset duration-150',
    'hover:not-disabled:bg-primario-25 hover:not-disabled:text-primario hover:not-disabled:ring-primario-250',
    'disabled:opacity-60',
    'focus-visible:outline-primario',
  ].join(' '),
  peligro: [
    'bg-error text-white duration-150',
    'hover:not-disabled:bg-error/90 active:not-disabled:scale-97',
    'disabled:opacity-60',
    'focus-visible:outline-error',
  ].join(' '),
  // Enlaces de acción dentro de tarjetas ("Ver tablero").
  fantasma: [
    'bg-transparent text-primario duration-150',
    'hover:not-disabled:bg-primario-50',
    'disabled:opacity-60',
    'focus-visible:outline-primario',
  ].join(' '),
  // Sobre el fondo oscuro del marco (la cabecera).
  marco: [
    'bg-transparent text-white duration-160 ease-estandar',
    'hover:not-disabled:bg-white/12 active:not-disabled:bg-white/12',
    'focus-visible:outline-white',
  ].join(' '),
};

const ESTILOS_POR_TAMANO = {
  pequeno: 'h-8 rounded-control px-3 text-detalle',
  mediano: 'h-8.5 rounded-control px-3.5 text-control',
  grande: 'h-9 rounded-control px-4 text-control',
  // Solo un icono: exige aria-label.
  icono: 'size-8.5 rounded-full',
};

/**
 * Botón del sistema de diseño: 34 px de alto, texto de 13 px en 600 y radio de
 * 9 px, como unifica el diseño.
 *
 * Mientras `cargando` sea verdadero el botón queda deshabilitado y muestra un
 * indicador de progreso, para que no se pueda enviar dos veces la misma acción.
 *
 * Con `tamano="icono"` el botón solo lleva un icono, así que necesita un
 * `aria-label` que diga qué hace.
 *
 * @param {object} props
 * @param {'primario'|'secundario'|'peligro'|'fantasma'|'marco'} [props.variante]
 * @param {'pequeno'|'mediano'|'grande'|'icono'} [props.tamano] 32, 34 y 36 px.
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
