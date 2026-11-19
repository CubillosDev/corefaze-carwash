import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDebounce } from '@/hooks/useDebounce';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useDebounce', () => {
  it('entrega el valor solo cuando deja de cambiar durante la espera', () => {
    const { result, rerender } = renderHook(({ valor }) => useDebounce(valor, 300), { initialProps: { valor: 'a' } });

    rerender({ valor: 'an' });
    act(() => vi.advanceTimersByTime(200));
    rerender({ valor: 'ana' });
    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBe('a');

    act(() => vi.advanceTimersByTime(100));
    expect(result.current).toBe('ana');
  });
});
