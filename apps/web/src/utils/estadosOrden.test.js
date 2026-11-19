import { describe, expect, it } from 'vitest';

import { ESTADOS_ORDEN, TRANSICIONES_ORDEN } from '@/constants/dominio';
import { avanceDeFase, contarPorEstado, FASES_DEL_TABLERO, siguientesEstados } from '@/utils/estadosOrden';

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
