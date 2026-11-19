import { describe, expect, it } from 'vitest';

import { ESTADOS_ORDEN, TRANSICIONES_ORDEN } from '@/constants/dominio';
import {
  accionAlSoltar,
  avanceDeFase,
  contarPorEstado,
  esRetroceso,
  FASES_DEL_TABLERO,
  motivoMovimientoNoPermitido,
  siguientesEstados,
} from '@/utils/estadosOrden';

const { REGISTRADA, EN_PROCESO, TERMINADA, ENTREGADA, CANCELADA } = ESTADOS_ORDEN;

describe('accionAlSoltar', () => {
  it('deja avanzar a la fase siguiente o volver a la anterior, sin saltos', () => {
    expect(accionAlSoltar(REGISTRADA, EN_PROCESO)).toBe('cambiar');
    expect(accionAlSoltar(EN_PROCESO, TERMINADA)).toBe('cambiar');
    expect(accionAlSoltar(EN_PROCESO, REGISTRADA)).toBe('cambiar');
    expect(accionAlSoltar(TERMINADA, EN_PROCESO)).toBe('cambiar');
    expect(accionAlSoltar(REGISTRADA, TERMINADA)).toBeNull();
    expect(accionAlSoltar(TERMINADA, REGISTRADA)).toBeNull();
  });

  it('entregar es cobrar en caja', () => {
    expect(accionAlSoltar(TERMINADA, ENTREGADA)).toBe('cobrar');
    expect(accionAlSoltar(EN_PROCESO, ENTREGADA)).toBeNull();
  });

  it('no cancela, no se queda en su columna ni mueve lo cerrado', () => {
    expect(accionAlSoltar(REGISTRADA, CANCELADA)).toBeNull();
    expect(accionAlSoltar(REGISTRADA, REGISTRADA)).toBeNull();
    expect(accionAlSoltar(REGISTRADA, null)).toBeNull();
    expect(accionAlSoltar(ENTREGADA, TERMINADA)).toBeNull();
  });
});

describe('esRetroceso', () => {
  it('reconoce volver a una fase anterior del tablero', () => {
    expect(esRetroceso(EN_PROCESO, REGISTRADA)).toBe(true);
    expect(esRetroceso(REGISTRADA, EN_PROCESO)).toBe(false);
    expect(esRetroceso(REGISTRADA, CANCELADA)).toBe(false);
  });
});

describe('motivoMovimientoNoPermitido', () => {
  it('dice a qué fases puede pasar o volver', () => {
    expect(motivoMovimientoNoPermitido(REGISTRADA)).toBe('Registrada solo puede pasar a En proceso');
    expect(motivoMovimientoNoPermitido(EN_PROCESO)).toBe(
      'En proceso solo puede pasar a Terminada o volver a Registrada',
    );
    expect(motivoMovimientoNoPermitido(TERMINADA)).toBe('Terminada solo puede pasar a Entregada o volver a En proceso');
    expect(motivoMovimientoNoPermitido(ENTREGADA)).toBe('Una orden entregada ya no cambia de fase');
  });
});

describe('siguientesEstados', () => {
  it('ofrece exactamente las transiciones del contrato', () => {
    for (const [estado, siguientes] of Object.entries(TRANSICIONES_ORDEN)) {
      expect(siguientesEstados(estado, true)).toEqual(siguientes);
    }
  });

  it('sin permiso de anular, quita la cancelación', () => {
    expect(siguientesEstados(ESTADOS_ORDEN.REGISTRADA, false)).not.toContain(ESTADOS_ORDEN.CANCELADA);
    expect(siguientesEstados(ESTADOS_ORDEN.REGISTRADA, false)).toContain(ESTADOS_ORDEN.EN_PROCESO);
  });

  it('una orden entregada o cancelada no ofrece cambios (R10)', () => {
    expect(siguientesEstados(ESTADOS_ORDEN.ENTREGADA, true)).toEqual([]);
    expect(siguientesEstados(ESTADOS_ORDEN.CANCELADA, true)).toEqual([]);
    expect(siguientesEstados('desconocido', true)).toEqual([]);
  });
});

describe('avanceDeFase', () => {
  it('avanza por partes iguales según la fase', () => {
    expect(FASES_DEL_TABLERO.map(avanceDeFase)).toEqual([25, 50, 75, 100]);
    expect(avanceDeFase(ESTADOS_ORDEN.CANCELADA)).toBe(0);
  });
});

describe('contarPorEstado', () => {
  it('cuenta las órdenes de cada estado, con cero en los que no tienen', () => {
    const conteo = contarPorEstado([{ estado: 'registrada' }, { estado: 'registrada' }, { estado: 'terminada' }]);

    expect(conteo).toMatchObject({ registrada: 2, en_proceso: 0, terminada: 1, entregada: 0, cancelada: 0 });
  });
});
