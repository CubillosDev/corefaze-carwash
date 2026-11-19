import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ConfirmarAccion } from '@/components/ui/ConfirmarAccion';

describe('ConfirmarAccion', () => {
  it('explica la acción y solo la ejecuta al confirmar', async () => {
    const alConfirmar = vi.fn();
    const alCancelar = vi.fn();
    render(
      <ConfirmarAccion abierto titulo="Eliminar el servicio" textoConfirmar="Eliminar" alConfirmar={alConfirmar} alCancelar={alCancelar}>
        No se puede deshacer.
      </ConfirmarAccion>,
    );

    expect(screen.getByRole('dialog', { name: 'Eliminar el servicio' })).toHaveTextContent('No se puede deshacer.');
    await userEvent.click(screen.getByRole('button', { name: 'Volver' }));
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }));

    expect(alCancelar).toHaveBeenCalledOnce();
    expect(alConfirmar).toHaveBeenCalledOnce();
  });

  it('muestra el mensaje de la API cuando la acción falla', () => {
    render(
      <ConfirmarAccion abierto titulo="Eliminar" textoConfirmar="Eliminar" error="Tiene órdenes asociadas" alConfirmar={() => {}} alCancelar={() => {}}>
        Texto
      </ConfirmarAccion>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Tiene órdenes asociadas');
  });
});
