import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Aviso } from '@/components/ui/Aviso';
import { useAviso } from '@/hooks/useAviso';

function Prueba() {
  const { aviso, mostrarAviso } = useAviso();
  return (
    <>
      <button type="button" onClick={() => mostrarAviso('Orden registrada')}>
        Mostrar
      </button>
      <Aviso aviso={aviso} />
    </>
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe('Aviso y useAviso', () => {
  it('anuncia el mensaje y lo quita solo después de unos segundos', () => {
    vi.useFakeTimers();
    render(<Prueba />);

    act(() => screen.getByRole('button', { name: 'Mostrar' }).click());
    expect(screen.getByRole('status')).toHaveTextContent('Orden registrada');

    act(() => vi.advanceTimersByTime(3300));
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });
});
