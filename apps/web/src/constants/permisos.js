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
  RUTAS.ORDENES_LAVADO,
  RUTAS.CAJA,
  RUTAS.CLIENTES,
  RUTAS.VEHICULOS,
  RUTAS.CREDITO,
  RUTAS.JORNADAS,
  RUTAS.NOMINA,
  RUTAS.INVENTARIO,
  RUTAS.REPORTES,
  RUTAS.COLABORADORES,
  RUTAS.SERVICIOS,
  RUTAS.USUARIOS,
]);

/**
 * El administrador consulta los usuarios (GET /api/usuarios), pero activar,
 * desactivar y cambiar el rol de una cuenta es solo de superadmin.
 */
const MODULOS_GESTIONABLES_DE_ADMINISTRADOR = Object.freeze(
  TODOS_LOS_MODULOS.filter((modulo) => modulo !== RUTAS.USUARIOS),
);

const MODULOS_POR_ROL = Object.freeze({
  superadmin: TODOS_LOS_MODULOS,
  administrador: TODOS_LOS_MODULOS,
  soporte: Object.freeze([
    RUTAS.INICIO,
    RUTAS.ORDENES_LAVADO,
    RUTAS.CAJA,
    RUTAS.CLIENTES,
    RUTAS.VEHICULOS,
    RUTAS.CREDITO,
    RUTAS.JORNADAS,
    RUTAS.INVENTARIO,
  ]),
  pendiente: Object.freeze([]),
});

/**
 * En qué módulos puede cada rol crear, editar y eliminar registros, además de
 * consultarlos. Sigue la matriz del ADR 0003 de roles (RBAC, SCRUM-139):
 * soporte consulta clientes y vehículos, pero solo superadmin y administrador
 * los gestionan; la API le responde 403 a soporte si lo intenta. Soporte sí
 * registra y edita órdenes de lavado (anularlas no: ese caso lo resuelve el
 * módulo de órdenes) y abre y cierra jornadas (reabrirlas es de superadmin).
 * También opera la caja (cobros, egresos, cierre). En crédito e inventario
 * hace la parte del día a día (verificar vales, sumar o restar insumos), que
 * deciden rolPuedeVerificarVales y rolPuedeMoverInventario.
 */
const MODULOS_GESTIONABLES_POR_ROL = Object.freeze({
  superadmin: TODOS_LOS_MODULOS,
  administrador: MODULOS_GESTIONABLES_DE_ADMINISTRADOR,
  soporte: Object.freeze([RUTAS.ORDENES_LAVADO, RUTAS.JORNADAS, RUTAS.CAJA]),
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

/**
 * ¿Puede el rol crear, editar y eliminar registros de este módulo? Sirve para
 * ocultar los botones de esas acciones; consultar el módulo lo decide
 * rolPuedeAcceder.
 *
 * @param {string|null|undefined} rol
 * @param {string} modulo Ruta del módulo, por ejemplo RUTAS.VEHICULOS.
 */
export function rolPuedeGestionar(rol, modulo) {
  return (MODULOS_GESTIONABLES_POR_ROL[rol] ?? []).includes(modulo);
}

/**
 * Anular (cancelar) una orden es de superadmin y administrador: a soporte la
 * API le responde 403. Solo oculta la opción; la API valida igual.
 *
 * @param {string|null|undefined} rol
 */
export function rolPuedeAnularOrden(rol) {
  return rol === 'superadmin' || rol === 'administrador';
}

/**
 * Reabrir una jornada cerrada es solo de superadmin.
 *
 * @param {string|null|undefined} rol
 */
export function rolPuedeReabrirJornada(rol) {
  return rol === 'superadmin';
}

const ROLES_QUE_OPERAN = Object.freeze(['superadmin', 'administrador', 'soporte']);

/**
 * Reabrir una caja ya arqueada es solo de superadmin, como la jornada.
 *
 * @param {string|null|undefined} rol
 */
export function rolPuedeReabrirCaja(rol) {
  return rol === 'superadmin';
}

/**
 * Recibir y verificar vales de crédito es operación diaria: también soporte.
 * Pagar y fijar cupo o corte lo decide rolPuedeGestionar(rol, RUTAS.CREDITO).
 *
 * @param {string|null|undefined} rol
 */
export function rolPuedeVerificarVales(rol) {
  return ROLES_QUE_OPERAN.includes(rol);
}

/**
 * Sumar o restar unidades de un insumo es del día a día: también soporte.
 * Crear, editar o desactivar insumos lo decide rolPuedeGestionar(rol, RUTAS.INVENTARIO).
 *
 * @param {string|null|undefined} rol
 */
export function rolPuedeMoverInventario(rol) {
  return ROLES_QUE_OPERAN.includes(rol);
}
