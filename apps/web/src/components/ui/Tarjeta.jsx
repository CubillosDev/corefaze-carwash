const RELLENOS = {
  ninguno: '',
  normal: 'px-4.5 py-3.5',
};

/**
 * Superficie blanca con borde y esquinas de 14 px: tarjetas y tablas del panel.
 *
 * @param {object} props
 * @param {'ninguno'|'normal'} [props.relleno]
 * @param {'div'|'section'|'article'|'aside'} [props.como] Etiqueta HTML.
 * @param {string} [props.className]
 * @param {import('react').ReactNode} props.children
 */
export function Tarjeta({ relleno = 'normal', como: Etiqueta = 'div', className = '', children, ...resto }) {
  return (
    <Etiqueta
      {...resto}
      className={`min-w-0 rounded-tarjeta border border-neutro-200 bg-white ${RELLENOS[relleno] ?? ''} ${className}`}
    >
      {children}
    </Etiqueta>
  );
}
