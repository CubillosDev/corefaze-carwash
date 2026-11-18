import { describe, expect, it } from 'vitest';

import {
  ESTADOS_ACTIVIDAD,
  ESTADOS_JORNADA,
  ESTADOS_ORDEN,
  MEDIOS_PAGO,
  TIPOS_CLIENTE,
  TIPOS_VEHICULO,
  TIPOS_VINCULACION,
} from '@/constants/dominio';
import {
  etiquetaCategoria,
  etiquetaEstadoOrden,
  etiquetaMedioPago,
  etiquetaTipoVehiculo,
  ETIQUETAS_ESTADO_ACTIVIDAD,
  ETIQUETAS_ESTADO_JORNADA,
  ETIQUETAS_ESTADO_ORDEN,
  ETIQUETAS_MEDIO_PAGO,
  ETIQUETAS_TIPO_CLIENTE,
  ETIQUETAS_TIPO_VEHICULO,
  ETIQUETAS_TIPO_VINCULACION,
  TONOS_ESTADO_ORDEN,
  tonoEstadoOrden,
} from '@/constants/etiquetas';

const PARES = [
  ['tipo de vehículo', TIPOS_VEHICULO, ETIQUETAS_TIPO_VEHICULO],
  ['estado de orden', ESTADOS_ORDEN, ETIQUETAS_ESTADO_ORDEN],
  ['tono de estado de orden', ESTADOS_ORDEN, TONOS_ESTADO_ORDEN],
  ['medio de pago', MEDIOS_PAGO, ETIQUETAS_MEDIO_PAGO],
  ['estado de jornada', ESTADOS_JORNADA, ETIQUETAS_ESTADO_JORNADA],
  ['tipo de cliente', TIPOS_CLIENTE, ETIQUETAS_TIPO_CLIENTE],
  ['tipo de vinculación', TIPOS_VINCULACION, ETIQUETAS_TIPO_VINCULACION],
  ['estado de actividad', ESTADOS_ACTIVIDAD, ETIQUETAS_ESTADO_ACTIVIDAD],
];

describe('etiquetas del dominio', () => {
  it.each(PARES)('cada %s del contrato tiene su texto, sin sobrantes', (_nombre, enumeracion, etiquetas) => {
    expect(Object.keys(etiquetas).sort()).toEqual(Object.values(enumeracion).sort());
    for (const valor of Object.values(enumeracion)) {
      expect(etiquetas[valor]).toBeTruthy();
    }
  });

  it('si llega un valor desconocido, muestra el valor tal cual', () => {
    expect(etiquetaTipoVehiculo('bicicleta')).toBe('bicicleta');
    expect(etiquetaEstadoOrden('archivada')).toBe('archivada');
    expect(etiquetaTipoVehiculo(null)).toBe('');
    expect(tonoEstadoOrden('archivada')).toBe('neutro');
  });

  it('traduce los valores conocidos', () => {
    expect(etiquetaTipoVehiculo('moto_hasta_150cc')).toBe('Moto hasta 150 cc');
    expect(etiquetaEstadoOrden('en_proceso')).toBe('En proceso');
    expect(etiquetaMedioPago('datafono')).toBe('Datáfono');
    expect(tonoEstadoOrden('terminada')).toBe('exito');
  });

  it('muestra la categoría libre con mayúscula inicial', () => {
    expect(etiquetaCategoria('lavado')).toBe('Lavado');
    expect(etiquetaCategoria('  ')).toBe('Sin categoría');
    expect(etiquetaCategoria(null)).toBe('Sin categoría');
  });
});
