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

/**
 * Opciones de la barra lateral, en orden. Solo se agrega una sección cuando su
 * página ya está registrada en src/app/router.jsx (una prueba lo verifica).
 * `icono` es la clave del icono que BarraLateral dibuja para la opción.
 */
export const MENU_PRINCIPAL = Object.freeze([
  Object.freeze({ ruta: RUTAS.INICIO, texto: 'Inicio', icono: 'inicio', exacta: true }),
  ...(import.meta.env.DEV
    ? [
        Object.freeze({
          ruta: RUTAS.SISTEMA_DISENO,
          texto: 'Sistema de diseño',
          icono: 'paleta',
          exacta: false,
        }),
      ]
    : []),
]);
