import { RUTAS } from '@/constants/rutas';

/**
 * Qué módulos del panel puede usar cada rol.
 *
 * Es solo experiencia de usuario: oculta lo que el rol no puede usar y muestra
 * "Sin permiso" si alguien escribe la dirección a mano. La API vuelve a validar
 * cada operación, así que este archivo NUNCA es el control de acceso.
 *
 * PROVISIONAL: la matriz oficial rol × módulo se define en SCRUM-139 (RBAC).
 * Cuando exista, se actualiza aquí y en ningún otro sitio.
 *
 * El rol `pendiente` no entra a ningún módulo: ve la pantalla de cuenta en
 * aprobación.
 */
const TODOS_LOS_MODULOS = Object.freeze([
  RUTAS.INICIO,
  RUTAS.CLIENTES,
  RUTAS.VEHICULOS,
  RUTAS.ORDENES_LAVADO,
  RUTAS.SERVICIOS,
  RUTAS.COLABORADORES,
  RUTAS.REPORTES,
]);

const MODULOS_POR_ROL = Object.freeze({
  superadmin: TODOS_LOS_MODULOS,
  administrador: TODOS_LOS_MODULOS,
  soporte: Object.freeze([RUTAS.INICIO, RUTAS.CLIENTES, RUTAS.VEHICULOS, RUTAS.ORDENES_LAVADO]),
  pendiente: Object.freeze([]),
});

/** Rutas que solo existen en desarrollo y se abren a cualquier rol con acceso. */
const RUTAS_DE_DESARROLLO = Object.freeze([RUTAS.SISTEMA_DISENO]);

/** Rol -> texto para mostrar. */
export const ETIQUETAS_ROL = Object.freeze({
  superadmin: 'Superadministrador',
  administrador: 'Administrador',
  soporte: 'Soporte',
  pendiente: 'Pendiente de aprobación',
});

/** @param {string|null|undefined} rol */
export function etiquetaDeRol(rol) {
  return ETIQUETAS_ROL[rol] ?? 'Sin rol';
}

/** El rol `pendiente` espera que un administrador le asigne acceso. */
export function esRolPendiente(rol) {
  return rol === 'pendiente';
}

/**
 * ¿Puede el rol abrir esta dirección? Una dirección pertenece al módulo cuya
 * ruta la contiene (`/vehiculos/5` es del módulo `/vehiculos`). Las direcciones
 * que no son de ningún módulo (la página 404) se permiten a cualquier rol con
 * acceso, para que la 404 siga siendo 404.
 *
 * @param {string|null|undefined} rol
 * @param {string} direccion Ruta del navegador (pathname).
 */
export function rolPuedeAcceder(rol, direccion) {
  const modulos = MODULOS_POR_ROL[rol];
  if (!modulos || esRolPendiente(rol)) {
    return false;
  }

  const pertenece = (ruta) =>
    ruta === RUTAS.INICIO ? direccion === ruta : direccion === ruta || direccion.startsWith(`${ruta}/`);

  if (RUTAS_DE_DESARROLLO.some(pertenece)) {
    return true;
  }

  const moduloDeLaDireccion = TODOS_LOS_MODULOS.find(pertenece);
  return moduloDeLaDireccion === undefined || modulos.includes(moduloDeLaDireccion);
}
