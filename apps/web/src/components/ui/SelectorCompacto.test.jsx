import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SelectorCompacto } from '@/components/ui/SelectorCompacto';

describe('SelectorCompacto', () => {
  it('asocia la etiqueta y avisa el valor elegido', async () => {
    const alCambiar = vi.fn();
    render(
      <SelectorCompacto
        etiqueta="Ordenar por"
        valor="nombre"
        alCambiar={alCambiar}
        opciones={[
          { valor: 'nombre', texto: 'Nombre (A–Z)' },
          { valor: 'documento', texto: 'Documento' },
        ]}
      />,
    );

    await userEvent.selectOptions(screen.getByLabelText('Ordenar por'), 'documento');

    expect(alCambiar).toHaveBeenCalledWith('documento');
  });
});
