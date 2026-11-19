import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useConfirmacion } from '@/hooks/useConfirmacion';

describe('useConfirmacion', () => {
  it('solo ejecuta al confirmar y luego se cierra', async () => {
    const ejecutar = vi.fn().mockResolvedValue('ok');
    const alTerminar = vi.fn();
    const { result } = renderHook(() => useConfirmacion({ ejecutar, alTerminar }));

    act(() => result.current.pedir({ id: 3 }));
    expect(ejecutar).not.toHaveBeenCalled();

    await act(() => result.current.confirmar());

    expect(ejecutar).toHaveBeenCalledWith({ id: 3 });
    expect(alTerminar).toHaveBeenCalledWith({ id: 3 }, 'ok');
    expect(result.current.pendiente).toBeNull();
  });

  it('si la API falla, conserva la confirmación con su mensaje', async () => {
    const ejecutar = vi.fn().mockRejectedValue(new Error('Tiene órdenes asociadas'));
    const { result } = renderHook(() => useConfirmacion({ ejecutar, alTerminar: vi.fn() }));

    act(() => result.current.pedir({ id: 3 }));
    await act(() => result.current.confirmar());

    expect(result.current.error).toBe('Tiene órdenes asociadas');
    expect(result.current.pendiente).toEqual({ id: 3 });
  });
});
