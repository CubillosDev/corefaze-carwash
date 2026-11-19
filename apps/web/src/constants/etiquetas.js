import {
  ESTADOS_ACTIVIDAD,
  ESTADOS_JORNADA,
  ESTADOS_ORDEN,
  MEDIOS_PAGO,
  TIPOS_CLIENTE,
  TIPOS_VEHICULO,
  TIPOS_VINCULACION,
} from '@/constants/dominio';

/*
 * Textos para mostrar de las enumeraciones del dominio. Los VALORES vienen de
 * packages/contratos/dominio.json (vía @/constants/dominio); aquí solo se
 * escribe cómo se leen en pantalla. Una prueba verifica que cada valor del
 * contrato tenga su texto.
 */

export const ETIQUETAS_TIPO_VEHICULO = Object.freeze({
  [TIPOS_VEHICULO.AUTOMOVIL]: 'Automóvil',
  [TIPOS_VEHICULO.CAMIONETA]: 'Camioneta',
  [TIPOS_VEHICULO.PLATON_7_PASAJEROS]: 'Platón 7 pasajeros',
  [TIPOS_VEHICULO.MOTO_HASTA_150CC]: 'Moto hasta 150 cc',
  [TIPOS_VEHICULO.MOTO_DESDE_150CC]: 'Moto desde 150 cc',
});

export const ETIQUETAS_ESTADO_ORDEN = Object.freeze({
  [ESTADOS_ORDEN.REGISTRADA]: 'Registrada',
  [ESTADOS_ORDEN.EN_PROCESO]: 'En proceso',
  [ESTADOS_ORDEN.TERMINADA]: 'Terminada',
  [ESTADOS_ORDEN.ENTREGADA]: 'Entregada',
  [ESTADOS_ORDEN.CANCELADA]: 'Cancelada',
});

/**
 * Tono de cada estado de orden (Insignia, columnas del tablero, barra del
 * patio). Sigue los colores de fase del diseño: ámbar al recibir, azul en
 * proceso y verde al terminar.
 */
export const TONOS_ESTADO_ORDEN = Object.freeze({
  [ESTADOS_ORDEN.REGISTRADA]: 'advertencia',
  [ESTADOS_ORDEN.EN_PROCESO]: 'primario',
  [ESTADOS_ORDEN.TERMINADA]: 'exito',
  [ESTADOS_ORDEN.ENTREGADA]: 'neutro',
  [ESTADOS_ORDEN.CANCELADA]: 'error',
});

export const ETIQUETAS_MEDIO_PAGO = Object.freeze({
  [MEDIOS_PAGO.EFECTIVO]: 'Efectivo',
  [MEDIOS_PAGO.NEQUI]: 'Nequi',
  [MEDIOS_PAGO.DAVIPLATA]: 'Daviplata',
  [MEDIOS_PAGO.BANCOLOMBIA]: 'Bancolombia',
  [MEDIOS_PAGO.DATAFONO]: 'Datáfono',
  [MEDIOS_PAGO.CREDITO]: 'Crédito',
});

export const ETIQUETAS_ESTADO_JORNADA = Object.freeze({
  [ESTADOS_JORNADA.ABIERTA]: 'Abierta',
  [ESTADOS_JORNADA.CERRADA]: 'Cerrada',
});

export const ETIQUETAS_TIPO_CLIENTE = Object.freeze({
  [TIPOS_CLIENTE.PARTICULAR]: 'Particular',
  [TIPOS_CLIENTE.EMPRESA]: 'Empresa',
});

export const ETIQUETAS_TIPO_VINCULACION = Object.freeze({
  [TIPOS_VINCULACION.FIJO]: 'Fijo',
  [TIPOS_VINCULACION.OCASIONAL]: 'Ocasional',
});

export const ETIQUETAS_ESTADO_ACTIVIDAD = Object.freeze({
  [ESTADOS_ACTIVIDAD.ACTIVO]: 'Activo',
  [ESTADOS_ACTIVIDAD.INACTIVO]: 'Inactivo',
});

/**
 * Categorías de un egreso de caja (egresos_caja_categoria_check, ADR 0007).
 * No están en dominio.json: las fija la base de datos.
 */
export const ETIQUETAS_CATEGORIA_EGRESO = Object.freeze({
  insumos: 'Insumos',
  almuerzos: 'Almuerzos',
  servicios_publicos: 'Servicios públicos',
  otros: 'Otros',
});

/** Tipos de descuento de nómina que se registran a mano (ADR 0006). */
export const ETIQUETAS_TIPO_DESCUENTO = Object.freeze({
  prestamo: 'Préstamo',
  jabon: 'Jabón',
  multa: 'Multa',
  cxc: 'Saldo anterior (cxc)',
});

/** Medios con que una empresa paga su crédito (ADR 0007). */
export const ETIQUETAS_MEDIO_PAGO_CREDITO = Object.freeze({
  transferencia: 'Transferencia',
  cheque: 'Cheque',
  efectivo: 'Efectivo',
});

/** Si el contrato agrega un valor nuevo, se muestra tal cual. */
const etiquetaDe = (etiquetas) => (valor) => etiquetas[valor] ?? String(valor ?? '');

export const etiquetaTipoVehiculo = etiquetaDe(ETIQUETAS_TIPO_VEHICULO);
export const etiquetaEstadoOrden = etiquetaDe(ETIQUETAS_ESTADO_ORDEN);
export const etiquetaMedioPago = etiquetaDe(ETIQUETAS_MEDIO_PAGO);
export const etiquetaEstadoJornada = etiquetaDe(ETIQUETAS_ESTADO_JORNADA);
export const etiquetaTipoCliente = etiquetaDe(ETIQUETAS_TIPO_CLIENTE);
export const etiquetaTipoVinculacion = etiquetaDe(ETIQUETAS_TIPO_VINCULACION);
export const etiquetaEstadoActividad = etiquetaDe(ETIQUETAS_ESTADO_ACTIVIDAD);
export const etiquetaCategoriaEgreso = etiquetaDe(ETIQUETAS_CATEGORIA_EGRESO);
export const etiquetaTipoDescuento = etiquetaDe(ETIQUETAS_TIPO_DESCUENTO);
export const etiquetaMedioPagoCredito = etiquetaDe(ETIQUETAS_MEDIO_PAGO_CREDITO);

/** Tono de un estado de orden; neutro si el contrato agrega uno nuevo. */
export const tonoEstadoOrden = (valor) => TONOS_ESTADO_ORDEN[valor] ?? 'neutro';

/**
 * La categoría de un servicio es texto libre de la API ("lavado"): se muestra
 * con mayúscula inicial.
 *
 * @param {string|null|undefined} categoria
 */
export function etiquetaCategoria(categoria) {
  const texto = String(categoria ?? '').trim();
  return texto === '' ? 'Sin categoría' : texto.charAt(0).toLocaleUpperCase('es-CO') + texto.slice(1);
}
