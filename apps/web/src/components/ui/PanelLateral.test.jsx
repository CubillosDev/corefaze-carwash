import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { PanelLateral } from '@/components/ui/PanelLateral';

function renderizar(propiedades = {}) {
  const alCerrar = vi.fn();
  render(
    <PanelLateral abierto alCerrar={alCerrar} titulo="Detalle del cliente" pie={<button type="button">Acción</button>} {...propiedades}>
      <p>Contenido del panel</p>
    </PanelLateral>,
  );
  return alCerrar;
}

describe('PanelLateral', () => {
  it('no dibuja nada cerrado', () => {
    renderizar({ abierto: false });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('se presenta como diálogo modal con su título, contenido y pie', () => {
    renderizar();

    const panel = screen.getByRole('dialog', { name: 'Detalle del cliente' });
    expect(panel).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('Contenido del panel')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Acción' })).toBeInTheDocument();
  });

  it('se cierra con su botón y con Escape', async () => {
    const alCerrar = renderizar();

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar panel' }));
    await userEvent.keyboard('{Escape}');

    expect(alCerrar).toHaveBeenCalledTimes(2);
  });
});
