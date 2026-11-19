import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ControlSegmentado } from '@/components/ui/ControlSegmentado';

const OPCIONES = [
  { valor: 'tablero', texto: 'Tablero' },
  { valor: 'lista', texto: 'Lista' },
];

describe('ControlSegmentado', () => {
  it('marca la opción elegida y avisa al elegir otra', async () => {
    const alCambiar = vi.fn();
    render(<ControlSegmentado etiqueta="Vista" opciones={OPCIONES} valor="tablero" alCambiar={alCambiar} />);

    expect(screen.getByRole('group', { name: 'Vista' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tablero' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Lista' })).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(screen.getByRole('button', { name: 'Lista' }));
    expect(alCambiar).toHaveBeenCalledWith('lista');
  });
});
