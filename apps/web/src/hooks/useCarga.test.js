import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useCarga } from '@/hooks/useCarga';

describe('useCarga', () => {
  it('empieza cargando y queda listo con los datos', async () => {
    const cargar = vi.fn().mockResolvedValue(['a']);
    const { result } = renderHook(() => useCarga(cargar));

    expect(result.current.situacion).toBe('cargando');
    await waitFor(() => expect(result.current.situacion).toBe('listo'));
    expect(result.current.datos).toEqual(['a']);
    expect(cargar).toHaveBeenCalledWith(expect.any(AbortSignal));
  });

  it('muestra el mensaje del error y vuelve a cargar al reintentar', async () => {
    const cargar = vi
      .fn()
      .mockRejectedValueOnce(new Error('Sin conexión'))
      .mockResolvedValueOnce(['b']);
    const { result } = renderHook(() => useCarga(cargar));

    await waitFor(() => expect(result.current.situacion).toBe('error'));
    expect(result.current.error).toBe('Sin conexión');

    act(() => result.current.recargar());
    expect(result.current.situacion).toBe('cargando');
    await waitFor(() => expect(result.current.datos).toEqual(['b']));
  });

  it('permite actualizar los datos sin volver a pedirlos', async () => {
    const cargar = vi.fn().mockResolvedValue([1]);
    const { result } = renderHook(() => useCarga(cargar));
    await waitFor(() => expect(result.current.situacion).toBe('listo'));

    act(() => result.current.actualizar((datos) => [...datos, 2]));

    expect(result.current.datos).toEqual([1, 2]);
    expect(cargar).toHaveBeenCalledOnce();
  });

  it('cancela la solicitud al desmontarse', () => {
    let senal;
    const cargar = vi.fn((signal) => {
      senal = signal;
      return new Promise(() => {});
    });
    const { unmount } = renderHook(() => useCarga(cargar));

    unmount();

    expect(senal.aborted).toBe(true);
  });
});
