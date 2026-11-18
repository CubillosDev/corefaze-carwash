/*
 * Tonos de la insignia. El texto usa el tono oscuro de cada estado para llegar
 * al contraste AA; el punto conserva el color sólido del diseño.
 */
const TONOS = {
  primario: { fondo: 'bg-primario/10', texto: 'text-primario-800', punto: 'bg-primario' },
  advertencia: {
    fondo: 'bg-advertencia-solido/10',
    texto: 'text-advertencia',
    punto: 'bg-advertencia-solido',
  },
  exito: { fondo: 'bg-exito-solido/12', texto: 'text-exito', punto: 'bg-exito-solido' },
  error: { fondo: 'bg-error-suave', texto: 'text-error', punto: 'bg-error' },
  neutro: { fondo: 'bg-neutro-100', texto: 'text-neutro-600', punto: 'bg-neutro-500' },
};

/**
 * Píldora de estado con punto de color: fase de una orden, jornada abierta o
 * cerrada, activo o inactivo.
 *
 * @param {object} props
 * @param {'primario'|'advertencia'|'exito'|'error'|'neutro'} [props.tono]
 * @param {import('react').ReactNode} props.children
 */
export function Insignia({ tono = 'neutro', children }) {
  const estilos = TONOS[tono] ?? TONOS.neutro;

  return (
    <span
      className={`inline-flex h-5.5 items-center gap-1.5 rounded-full px-2.25 text-nota font-semibold whitespace-nowrap ${estilos.fondo} ${estilos.texto}`}
    >
      <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${estilos.punto}`} />
      {children}
    </span>
  );
}
