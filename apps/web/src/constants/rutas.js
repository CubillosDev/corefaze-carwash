/**
 * Rutas del navegador, en kebab-case y en español.
 *
 * Se usan siempre por constante (RUTAS.INICIO) y nunca escribiendo el literal
 * a mano, para que renombrar una sección sea un solo cambio.
 */
export const RUTAS = Object.freeze({
  INICIO: '/',
  INGRESO: '/ingreso',
  ORDENES_LAVADO: '/ordenes-lavado',
  CAJA: '/caja',
  CLIENTES: '/clientes',
  VEHICULOS: '/vehiculos',
  CREDITO: '/credito',
  COLABORADORES: '/colaboradores',
  SERVICIOS: '/servicios',
  JORNADAS: '/jornadas',
  NOMINA: '/nomina',
  INVENTARIO: '/inventario',
  USUARIOS: '/usuarios',
  REPORTES: '/reportes',

  /** Catálogo visual del sistema de diseño. Solo se publica en desarrollo. */
  SISTEMA_DISENO: '/sistema-diseno',
});

/** Grupos de la barra lateral, en el orden del diseño. */
export const GRUPOS_MENU = Object.freeze({
  PRINCIPAL: 'Principal',
  OPERACION: 'Operación',
  ADMINISTRACION: 'Administración',
  DESARROLLO: 'Desarrollo',
});

const opcion = (ruta, texto, icono, grupo, exacta = false) =>
  Object.freeze({ ruta, texto, icono, grupo, exacta });

/**
 * Opciones de la barra lateral, en orden y agrupadas como en el diseño. Solo se
 * agrega una sección cuando su página ya está registrada en src/app/router.jsx
 * (una prueba lo verifica). `icono` es la clave del icono que BarraLateral
 * dibuja para la opción.
 */
export const MENU_PRINCIPAL = Object.freeze([
  opcion(RUTAS.INICIO, 'Inicio', 'inicio', GRUPOS_MENU.PRINCIPAL, true),
  opcion(RUTAS.ORDENES_LAVADO, 'Órdenes', 'ordenes', GRUPOS_MENU.OPERACION),
  opcion(RUTAS.CAJA, 'Caja', 'caja', GRUPOS_MENU.OPERACION),
  opcion(RUTAS.CLIENTES, 'Clientes', 'clientes', GRUPOS_MENU.OPERACION),
  opcion(RUTAS.CREDITO, 'Crédito', 'credito', GRUPOS_MENU.OPERACION),
  opcion(RUTAS.JORNADAS, 'Jornadas', 'jornadas', GRUPOS_MENU.OPERACION),
  opcion(RUTAS.VEHICULOS, 'Vehículos', 'vehiculo', GRUPOS_MENU.OPERACION),
  opcion(RUTAS.NOMINA, 'Nómina', 'nomina', GRUPOS_MENU.ADMINISTRACION),
  opcion(RUTAS.INVENTARIO, 'Inventario', 'inventario', GRUPOS_MENU.ADMINISTRACION),
  opcion(RUTAS.REPORTES, 'Reportes', 'reportes', GRUPOS_MENU.ADMINISTRACION),
  opcion(RUTAS.COLABORADORES, 'Colaboradores', 'colaboradores', GRUPOS_MENU.ADMINISTRACION),
  opcion(RUTAS.SERVICIOS, 'Catálogo', 'catalogo', GRUPOS_MENU.ADMINISTRACION),
  opcion(RUTAS.USUARIOS, 'Usuarios', 'usuarios', GRUPOS_MENU.ADMINISTRACION),
  ...(import.meta.env.DEV
    ? [opcion(RUTAS.SISTEMA_DISENO, 'Sistema de diseño', 'paleta', GRUPOS_MENU.DESARROLLO)]
    : []),
]);
