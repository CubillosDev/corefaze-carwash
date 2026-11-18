/*
 * Clases del botón del sistema de diseño, compartidas por Boton (button) y
 * EnlaceBoton (enlace con aspecto de botón).
 */

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
 * Clases de un botón según su variante y tamaño.
 *
 * @param {object} opciones
 * @param {'primario'|'secundario'|'peligro'|'fantasma'|'marco'} [opciones.variante]
 * @param {'pequeno'|'mediano'|'grande'|'icono'} [opciones.tamano]
 * @param {string} [opciones.className]
 * @returns {string}
 */
export function clasesDeBoton({ variante = 'primario', tamano = 'mediano', className = '' } = {}) {
  return [
    ESTILOS_BASE,
    ESTILOS_POR_VARIANTE[variante] ?? ESTILOS_POR_VARIANTE.primario,
    ESTILOS_POR_TAMANO[tamano] ?? ESTILOS_POR_TAMANO.mediano,
    className,
  ]
    .filter(Boolean)
    .join(' ');
}
