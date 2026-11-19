import { describe, expect, it } from 'vitest';

import { mayusculaInicial } from '@/utils/mayusculaInicial';

describe('mayusculaInicial', () => {
  it('cambia solo la primera letra', () => {
    expect(mayusculaInicial('ayer a esta hora')).toBe('Ayer a esta hora');
    expect(mayusculaInicial('el 17/11')).toBe('El 17/11');
    expect(mayusculaInicial('')).toBe('');
  });
});
