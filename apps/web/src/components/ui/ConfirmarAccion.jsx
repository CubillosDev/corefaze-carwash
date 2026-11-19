import { Alerta } from '@/components/ui/Alerta';
import { Boton } from '@/components/ui/Boton';
import { Modal } from '@/components/ui/Modal';

/**
 * Confirmación antes de una acción que no se deshace fácil: cerrar una
 * jornada, eliminar un registro o desactivar a alguien. Si la API la rechaza,
 * muestra su mensaje sin cerrarse.
 *
 * @param {object} props
 * @param {boolean} props.abierto
 * @param {string} props.titulo
 * @param {import('react').ReactNode} props.children Qué va a pasar.
 * @param {string} props.textoConfirmar
 * @param {'primario'|'peligro'} [props.variante]
 * @param {boolean} [props.enviando]
 * @param {string} [props.error]
 * @param {() => void} props.alConfirmar
 * @param {() => void} props.alCancelar
 */
export function ConfirmarAccion({
  abierto,
  titulo,
  children,
  textoConfirmar,
  variante = 'primario',
  enviando = false,
  error = '',
  alConfirmar,
  alCancelar,
}) {
  return (
    <Modal
      abierto={abierto}
      alCerrar={alCancelar}
      tamano="pequeno"
      titulo={titulo}
      pie={
        <>
          <Boton variante="secundario" tamano="grande" onClick={alCancelar}>
            Volver
          </Boton>
          <Boton variante={variante} tamano="grande" cargando={enviando} onClick={alConfirmar}>
            {textoConfirmar}
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div>{children}</div>
        {error ? (
          <Alerta tipo="error" titulo="No se pudo completar">
            {error}
          </Alerta>
        ) : null}
      </div>
    </Modal>
  );
}
