import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { EstadoError } from '@/components/ui/EstadoError';

describe('EstadoError', () => {
  it('muestra el mensaje y vuelve a intentar', async () => {
    const alReintentar = vi.fn();
    render(<EstadoError mensaje="Sin conexión con el servidor." alReintentar={alReintentar} />);

    expect(screen.getByText('Sin conexión con el servidor.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(alReintentar).toHaveBeenCalledOnce();
  });
});
