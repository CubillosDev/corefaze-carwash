import { ProveedorSesion } from '@/features/autenticacion';

/**
 * Punto único donde se montan los contextos globales de la aplicación
 * (sesión, notificaciones, cliente de datos...).
 *
 * Cada tarea que agregue un contexto lo envuelve aquí y así App.jsx no cambia.
 *
 * @param {{ children: import('react').ReactNode }} props
 */
export function Providers({ children }) {
  return <ProveedorSesion>{children}</ProveedorSesion>;
}
