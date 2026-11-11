import { ESTADOS_ORDEN, TIPOS_VEHICULO } from '@/constants/dominio';

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

/** Texto de un tipo de vehículo; si el contrato agrega uno nuevo, muestra su valor. */
export const etiquetaTipoVehiculo = (valor) => ETIQUETAS_TIPO_VEHICULO[valor] ?? String(valor ?? '');

/** Texto de un estado de orden; si el contrato agrega uno nuevo, muestra su valor. */
export const etiquetaEstadoOrden = (valor) => ETIQUETAS_ESTADO_ORDEN[valor] ?? String(valor ?? '');
