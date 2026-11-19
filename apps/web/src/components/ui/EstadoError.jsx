import { Alerta } from '@/components/ui/Alerta';
import { Boton } from '@/components/ui/Boton';

/**
 * Error al cargar datos, con el botón para volver a intentarlo. El mensaje ya
 * viene listo para mostrar (lo arma lib/httpCliente.js): nunca es técnico.
 *
 * @param {object} props
 * @param {string} props.mensaje
 * @param {() => void} props.alReintentar
 * @param {string} [props.titulo]
 * @param {string} [props.className]
 */
export function EstadoError({
  mensaje,
  alReintentar,
  titulo = 'No pudimos cargar la información',
  className = '',
}) {
  return (
    <div className={`flex flex-col items-start gap-3 ${className}`}>
      <Alerta tipo="error" titulo={titulo} className="w-full">
        {mensaje}
      </Alerta>
      <Boton variante="secundario" onClick={alReintentar}>
        Reintentar
      </Boton>
    </div>
  );
}
