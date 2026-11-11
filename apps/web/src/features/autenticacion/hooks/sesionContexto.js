import { createContext } from 'react';

/**
 * Valor por defecto: sin sesión. Permite renderizar componentes que leen la
 * sesión (el menú de perfil, la barra lateral) fuera del proveedor sin romper.
 */
export const SESION_VACIA = Object.freeze({
  usuario: null,
  motivoCierre: null,
  iniciarSesion: async () => {
    throw new Error('iniciarSesion se usa dentro de ProveedorSesion');
  },
  cerrarSesion: () => {},
});

export const SesionContexto = createContext(SESION_VACIA);
