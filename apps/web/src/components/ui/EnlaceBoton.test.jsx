import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { EnlaceBoton } from '@/components/ui/EnlaceBoton';

describe('EnlaceBoton', () => {
  it('es un enlace con el aspecto del botón primario', () => {
    render(
      <MemoryRouter>
        <EnlaceBoton hacia="/">Volver al inicio</EnlaceBoton>
      </MemoryRouter>,
    );

    const enlace = screen.getByRole('link', { name: 'Volver al inicio' });
    expect(enlace).toHaveAttribute('href', '/');
    expect(enlace).toHaveClass('bg-primario', 'h-8.5');
  });
});
