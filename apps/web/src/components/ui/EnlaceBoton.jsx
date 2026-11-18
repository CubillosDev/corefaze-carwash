import { Link } from 'react-router';

import { clasesDeBoton } from '@/components/ui/estilosBoton';

/**
 * Enlace interno con el aspecto del botón del sistema de diseño ("Volver al
 * inicio"). Navega: para acciones se usa Boton.
 *
 * @param {object} props
 * @param {string} props.hacia Ruta del navegador.
 * @param {'primario'|'secundario'} [props.variante]
 * @param {import('react').ReactNode} props.children
 */
export function EnlaceBoton({ hacia, variante = 'primario', children }) {
  return (
    <Link to={hacia} className={clasesDeBoton({ variante })}>
      {children}
    </Link>
  );
}
