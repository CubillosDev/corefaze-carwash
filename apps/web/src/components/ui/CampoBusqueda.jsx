import { IconoBuscar } from '@/components/ui/iconos/IconoBuscar';

const VARIANTES = {
  normal: 'h-8.75 border-neutro-300 bg-white focus-visible:shadow-foco-campo',
  // Dentro de modales: fondo gris que se vuelve blanco al enfocar.
  suave: 'h-9 border-neutro-275 bg-neutro-25 focus-visible:bg-white',
};

/**
 * Campo de búsqueda con lupa. La etiqueta es solo para lectores de pantalla:
 * el texto de ejemplo dice qué se puede buscar.
 *
 * @param {object} props
 * @param {string} props.etiqueta Nombre accesible del campo.
 * @param {string} props.valor
 * @param {(valor: string) => void} props.alCambiar
 * @param {string} [props.marcador]
 * @param {'normal'|'suave'} [props.variante]
 * @param {string} [props.className]
 */
export function CampoBusqueda({
  etiqueta,
  valor,
  alCambiar,
  marcador,
  variante = 'normal',
  className = '',
}) {
  return (
    <div className={`relative ${className}`}>
      <IconoBuscar className="pointer-events-none absolute top-1/2 left-2.75 size-3.75 -translate-y-1/2 text-neutro-450" />
      <input
        type="search"
        aria-label={etiqueta}
        value={valor}
        onChange={(evento) => alCambiar(evento.target.value)}
        placeholder={marcador}
        className={`w-full rounded-control border pr-3 pl-8.25 text-control text-neutro-900 outline-none transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-neutro-400 focus-visible:border-primario ${
          VARIANTES[variante] ?? VARIANTES.normal
        }`}
      />
    </div>
  );
}
