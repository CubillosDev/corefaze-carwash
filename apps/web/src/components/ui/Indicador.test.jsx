import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { Indicador } from '@/components/ui/Indicador';

describe('Indicador', () => {
  it('muestra etiqueta, valor y apoyo', () => {
    render(<Indicador etiqueta="En patio" valor="5" apoyo="Registradas y en proceso" />);

    expect(screen.getByText('En patio')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Registradas y en proceso')).toBeInTheDocument();
  });

  it('con destino, toda la tarjeta es un enlace', () => {
    render(
      <MemoryRouter>
        <Indicador etiqueta="En patio" valor="5" hacia="/ordenes-lavado" />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /En patio/ })).toHaveAttribute('href', '/ordenes-lavado');
  });
});
