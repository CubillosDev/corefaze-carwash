import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { GrupoFiltros } from '@/components/ui/GrupoFiltros';

const OPCIONES = [
  { valor: 'todas', texto: 'Todas', cantidad: 4 },
  { valor: 'en_proceso', texto: 'En proceso', cantidad: 1 },
  { valor: 'sin_contador', texto: 'Sin contador' },
];

describe('GrupoFiltros', () => {
  it('muestra cada filtro con su contador y marca el activo', () => {
    render(<GrupoFiltros etiqueta="Estado" opciones={OPCIONES} valor="todas" alCambiar={() => {}} />);

    expect(screen.getByRole('button', { name: 'Todas 4' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'En proceso 1' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Sin contador' })).toBeInTheDocument();
  });

  it('avisa el valor del filtro elegido', async () => {
    const alCambiar = vi.fn();
    render(<GrupoFiltros etiqueta="Estado" opciones={OPCIONES} valor="todas" alCambiar={alCambiar} />);

    await userEvent.click(screen.getByRole('button', { name: 'En proceso 1' }));

    expect(alCambiar).toHaveBeenCalledWith('en_proceso');
  });
});
