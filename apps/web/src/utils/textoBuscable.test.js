import { describe, expect, it } from 'vitest';

import { textoBuscable } from '@/utils/textoBuscable';

describe('textoBuscable', () => {
  it('quita tildes, mayúsculas y espacios de los bordes', () => {
    expect(textoBuscable('  ¿Cómo CIERRO la Caja? ')).toBe('¿como cierro la caja?');
    expect(textoBuscable('Crédito')).toBe('credito');
    expect(textoBuscable(null)).toBe('');
  });
});
