import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { MenuMoverOrden } from '@/features/ordenes-lavado/components/MenuMoverOrden';

function renderizar(props) {
  render(
    <MemoryRouter>
      <MenuMoverOrden descripcion="la orden de AAA 111" puedeAnular={false} alElegir={vi.fn()} {...props} />
    </MemoryRouter>,
  );
}

describe('MenuMoverOrden', () => {
  it('ofrece devolver una orden a la fase anterior', async () => {
    const usuario = userEvent.setup();
    const alElegir = vi.fn();
    renderizar({ estado: 'en_proceso', alElegir });

    await usuario.click(screen.getByRole('button', { name: 'Cambiar el estado de la orden de AAA 111' }));
    expect(screen.getByRole('menuitem', { name: 'Terminada' })).toBeInTheDocument();
    await usuario.click(screen.getByRole('menuitem', { name: 'Devolver a Registrada' }));
    expect(alElegir).toHaveBeenCalledWith('registrada');
  });

  it('ofrece cobrar en caja en vez de entregar una orden terminada', async () => {
    const usuario = userEvent.setup();
    renderizar({ estado: 'terminada', enlaceCobro: '/caja?orden=7' });

    await usuario.click(screen.getByRole('button', { name: 'Cambiar el estado de la orden de AAA 111' }));

    expect(screen.getByRole('menuitem', { name: 'Cobrar en caja' })).toHaveAttribute('href', '/caja?orden=7');
    expect(screen.queryByRole('menuitem', { name: 'Entregada' })).not.toBeInTheDocument();
  });

  it('sin enlace de cobro mantiene la transición a entregada', async () => {
    const usuario = userEvent.setup();
    const alElegir = vi.fn();
    renderizar({ estado: 'terminada', alElegir });

    await usuario.click(screen.getByRole('button', { name: 'Cambiar el estado de la orden de AAA 111' }));
    await usuario.click(screen.getByRole('menuitem', { name: 'Entregada' }));

    expect(alElegir).toHaveBeenCalledWith('entregada');
  });
});
