import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useFormulario } from '@/hooks/useFormulario';
import { ErrorHttp } from '@/lib/httpCliente';

const validar = (valores) =>
  valores.nombre ? { valido: true, errores: {}, datos: { nombre: valores.nombre } } : { valido: false, errores: { nombre: 'Falta' }, datos: {} };

describe('useFormulario', () => {
  it('no envía si el formato no es válido', async () => {
    const enviar = vi.fn();
    const { result } = renderHook(() => useFormulario({ inicial: { nombre: '' }, validar, enviar, alGuardar: vi.fn() }));

    await act(() => result.current.enviarFormulario());

    expect(result.current.errores).toEqual({ nombre: 'Falta' });
    expect(enviar).not.toHaveBeenCalled();
  });

  it('envía los datos validados y entrega la respuesta', async () => {
    const alGuardar = vi.fn();
    const enviar = vi.fn().mockResolvedValue({ id: 1 });
    const { result } = renderHook(() => useFormulario({ inicial: { nombre: '' }, validar, enviar, alGuardar }));

    act(() => result.current.cambiar('nombre', 'Ana'));
    await act(() => result.current.enviarFormulario());

    expect(enviar).toHaveBeenCalledWith({ nombre: 'Ana' });
    expect(alGuardar).toHaveBeenCalledWith({ id: 1 });
  });

  it('muestra el mensaje y los errores por campo de la API', async () => {
    const enviar = vi.fn().mockRejectedValue(
      new ErrorHttp('Ya existe un cliente con ese documento', { estado: 409, erroresPorCampo: { documento: 'Repetido' } }),
    );
    const { result } = renderHook(() => useFormulario({ inicial: { nombre: 'Ana' }, validar, enviar, alGuardar: vi.fn() }));

    await act(() => result.current.enviarFormulario());

    expect(result.current.errorDeApi).toBe('Ya existe un cliente con ese documento');
    expect(result.current.errores).toEqual({ documento: 'Repetido' });
    expect(result.current.enviando).toBe(false);
  });
});
