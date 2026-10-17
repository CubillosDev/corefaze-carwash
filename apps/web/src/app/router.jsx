import { createBrowserRouter } from 'react-router';

import { LayoutPrincipal } from '@/components/layout/LayoutPrincipal';
import { RUTAS } from '@/constants/rutas';
import { InicioPage, NoEncontradaPage } from '@/features/inicio';
import { SistemaDisenoPage } from '@/features/sistema-diseno';

/**
 * El catálogo del sistema de diseño es una herramienta de trabajo: se publica
 * solo en desarrollo. En la compilación de producción import.meta.env.DEV es
 * false y la ruta desaparece del paquete.
 */
const rutasDeDesarrollo = import.meta.env.DEV
  ? [{ path: RUTAS.SISTEMA_DISENO, element: <SistemaDisenoPage /> }]
  : [];

export const router = createBrowserRouter([
  {
    path: RUTAS.INICIO,
    element: <LayoutPrincipal />,
    children: [
      { index: true, element: <InicioPage /> },
      ...rutasDeDesarrollo,
      { path: '*', element: <NoEncontradaPage /> },
    ],
  },
]);
