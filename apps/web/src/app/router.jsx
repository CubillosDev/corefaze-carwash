import { lazy } from 'react';
import { createBrowserRouter } from 'react-router';

import { LayoutPrincipal } from '@/components/layout/LayoutPrincipal';
import { RUTAS } from '@/constants/rutas';
import { IngresoPage, RutaConPermiso, RutaPrivada } from '@/features/autenticacion';

/**
 * Página con carga diferida: se descarga aparte, la primera vez que se visita.
 * Se toma del index.js de su feature, que es lo único que un feature expone.
 */
const paginaDiferida = (cargarFeature, nombre) =>
  lazy(() => cargarFeature().then((modulo) => ({ default: modulo[nombre] })));

const cargarInicio = () => import('@/features/inicio');

/**
 * El catálogo del sistema de diseño es una herramienta de trabajo: solo existe
 * en desarrollo. En producción import.meta.env.DEV es false y la página no
 * llega al paquete.
 */
const rutasDeDesarrollo = import.meta.env.DEV
  ? [
      {
        path: RUTAS.SISTEMA_DISENO,
        Component: paginaDiferida(() => import('@/features/sistema-diseno'), 'SistemaDisenoPage'),
      },
    ]
  : [];

/*
 * Estructura:
 *   /ingreso            pública
 *   RutaPrivada         sin sesión -> /ingreso; cuenta pendiente -> pantalla de espera
 *     LayoutPrincipal   cabecera, menú y área de contenido
 *       RutaConPermiso  rol sin acceso al módulo -> "Sin permiso" (403)
 *         páginas
 */
export const rutas = [
  { path: RUTAS.INGRESO, Component: IngresoPage },
  {
    Component: RutaPrivada,
    children: [
      {
        path: RUTAS.INICIO,
        Component: LayoutPrincipal,
        children: [
          {
            Component: RutaConPermiso,
            children: [
              { index: true, Component: paginaDiferida(cargarInicio, 'InicioPage') },
              ...rutasDeDesarrollo,
              { path: '*', Component: paginaDiferida(cargarInicio, 'NoEncontradaPage') },
            ],
          },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(rutas);
