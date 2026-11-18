import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Paginacion } from '@/components/ui/Paginacion';

describe('Paginacion', () => {
  it('muestra el rango visible y marca la página actual', () => {
    render(<Paginacion pagina={1} totalPaginas={3} totalElementos={25} porPagina={10} alCambiar={() => {}} />);

    expect(screen.getByText('11–20 de 25')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page');
  });

  it('cambia de página con los números y las flechas', async () => {
    const alCambiar = vi.fn();
    render(<Paginacion pagina={1} totalPaginas={3} totalElementos={25} porPagina={10} alCambiar={alCambiar} />);

    await userEvent.click(screen.getByRole('button', { name: 'Página 3' }));
    await userEvent.click(screen.getByRole('button', { name: 'Página anterior' }));
    await userEvent.click(screen.getByRole('button', { name: 'Página siguiente' }));

    expect(alCambiar.mock.calls).toEqual([[2], [0], [2]]);
  });

  it('deshabilita las flechas en los extremos y dice 0 resultados si no hay datos', () => {
    render(<Paginacion pagina={0} totalPaginas={1} totalElementos={0} porPagina={10} alCambiar={() => {}} />);

    expect(screen.getByText('0 resultados')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Página siguiente' })).toBeDisabled();
  });
});
