/**
 * Rutas del navegador, en kebab-case y en español.
 *
 * Se usan siempre por constante (RUTAS.INICIO) y nunca escribiendo el literal
 * a mano, para que renombrar una sección sea un solo cambio.
 */
export const RUTAS = Object.freeze({
  INICIO: '/',
  INGRESO: '/ingreso',
  CLIENTES: '/clientes',
  VEHICULOS: '/vehiculos',
  ORDENES_LAVADO: '/ordenes-lavado',
  SERVICIOS: '/servicios',
  COLABORADORES: '/colaboradores',
  REPORTES: '/reportes',

  /** Catálogo visual del sistema de diseño. Solo se publica en desarrollo. */
  SISTEMA_DISENO: '/sistema-diseno',
});
