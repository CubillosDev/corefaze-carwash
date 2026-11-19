import contrato from '@contratos/dominio.json';
import { describe, expect, it } from 'vitest';

import {
  ESTADOS_ORDEN,
  MEDIOS_PAGO,
  PATRONES_PLACA,
  ROLES,
  TRANSICIONES_ORDEN,
} from '@/constants/dominio';

describe('constantes del dominio', () => {
  it('se leen del contrato compartido con la API', () => {
    expect(Object.values(ESTADOS_ORDEN)).toEqual(contrato.estadosOrden);
    expect(Object.values(MEDIOS_PAGO)).toEqual(contrato.mediosPago);
    expect(ROLES).toEqual(contrato.roles);
    expect(TRANSICIONES_ORDEN).toEqual(contrato.transicionesOrden);
  });

  it('exponen las enumeraciones con llaves en UPPER_SNAKE_CASE', () => {
    expect(ESTADOS_ORDEN.EN_PROCESO).toBe('en_proceso');
    expect(MEDIOS_PAGO.EFECTIVO).toBe('efectivo');
  });

  it('no se pueden modificar por accidente', () => {
    expect(Object.isFrozen(ESTADOS_ORDEN)).toBe(true);
    expect(Object.isFrozen(TRANSICIONES_ORDEN)).toBe(true);
    expect(Object.isFrozen(TRANSICIONES_ORDEN.registrada)).toBe(true);
  });

  it('no congela el JSON del contrato que comparte el empaquetador', () => {
    expect(Object.isFrozen(contrato)).toBe(false);
  });

  it('arma los patrones de placa como expresiones regulares', () => {
    expect(PATRONES_PLACA.CARRO.test('ABC123')).toBe(true);
    expect(PATRONES_PLACA.MOTO.test('ABC12D')).toBe(true);
    expect(PATRONES_PLACA.CARRO.test('ABC12D')).toBe(false);
  });
});
