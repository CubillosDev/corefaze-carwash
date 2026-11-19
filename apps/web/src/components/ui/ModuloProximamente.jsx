import { EncabezadoPagina } from '@/components/ui/EncabezadoPagina';
import { EstadoVacio } from '@/components/ui/EstadoVacio';
import { Tarjeta } from '@/components/ui/Tarjeta';

/**
 * Página de un módulo del diseño que la API todavía no soporta: conserva el
 * encabezado y el marco, y en lugar de datos inventados muestra un estado
 * vacío honesto que explica qué falta.
 *
 * @param {object} props
 * @param {string} props.titulo
 * @param {string} props.descripcion Línea bajo el título.
 * @param {string} props.motivo Qué le falta a la API.
 * @param {import('react').ReactNode} props.icono
 * @param {import('react').ReactNode} [props.accion] Enlace a lo que sí existe.
 */
export function ModuloProximamente({ titulo, descripcion, motivo, icono, accion }) {
  return (
    <div className="flex flex-col">
      <EncabezadoPagina titulo={titulo} descripcion={descripcion} />
      <Tarjeta relleno="ninguno" className="mt-4.5">
        <EstadoVacio
          icono={icono}
          titulo="Disponible próximamente"
          descripcion={motivo}
          accion={accion}
          className="py-16"
        />
      </Tarjeta>
    </div>
  );
}
