import { describe, expect, it } from 'vitest';

import { plural } from '@/utils/plural';

describe('plural', () => {
  it('usa el singular solo para uno', () => {
    expect(plural(1, 'vehículo', 'vehículos')).toBe('1 vehículo');
    expect(plural(0, 'vehículo', 'vehículos')).toBe('0 vehículos');
    expect(plural(3, 'orden', 'órdenes')).toBe('3 órdenes');
  });
});
