import { describe, expect, it } from 'vitest';

import { ESTADOS_ORDEN, TIPOS_VEHICULO } from '@/constants/dominio';
import {
  etiquetaEstadoOrden,
  etiquetaTipoVehiculo,
  ETIQUETAS_ESTADO_ORDEN,
  ETIQUETAS_TIPO_VEHICULO,
} from '@/constants/etiquetas';

describe('etiquetas del dominio', () => {
  it('hay un texto para cada tipo de vehículo del contrato', () => {
    for (const tipo of Object.values(TIPOS_VEHICULO)) {
      expect(ETIQUETAS_TIPO_VEHICULO[tipo], `falta la etiqueta de ${tipo}`).toBeTruthy();
    }
  });

  it('hay un texto para cada estado de orden del contrato', () => {
    for (const estado of Object.values(ESTADOS_ORDEN)) {
      expect(ETIQUETAS_ESTADO_ORDEN[estado], `falta la etiqueta de ${estado}`).toBeTruthy();
    }
  });

  it('no hay etiquetas sobrantes que ya no existan en el contrato', () => {
    expect(Object.keys(ETIQUETAS_TIPO_VEHICULO).sort()).toEqual(Object.values(TIPOS_VEHICULO).sort());
    expect(Object.keys(ETIQUETAS_ESTADO_ORDEN).sort()).toEqual(Object.values(ESTADOS_ORDEN).sort());
  });

  it('si llega un valor desconocido, muestra el valor tal cual', () => {
    expect(etiquetaTipoVehiculo('bicicleta')).toBe('bicicleta');
    expect(etiquetaEstadoOrden('archivada')).toBe('archivada');
    expect(etiquetaTipoVehiculo(null)).toBe('');
  });

  it('traduce los valores conocidos', () => {
    expect(etiquetaTipoVehiculo('moto_hasta_150cc')).toBe('Moto hasta 150 cc');
    expect(etiquetaEstadoOrden('en_proceso')).toBe('En proceso');
  });
});
