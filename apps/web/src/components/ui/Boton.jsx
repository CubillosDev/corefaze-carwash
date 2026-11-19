import { clasesDeBoton } from '@/components/ui/estilosBoton';
import { IconoCargando } from '@/components/ui/iconos/IconoCargando';

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
  const clases = clasesDeBoton({ variante, tamano, className });

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
