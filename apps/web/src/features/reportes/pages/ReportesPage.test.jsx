import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { ReportesPage } from '@/features/reportes';
import { UsuariosPage } from '@/features/usuarios';

describe('módulos sin endpoint en la API', () => {
  it.each([
    ['Reportes', ReportesPage],
    ['Usuarios', UsuariosPage],
  ])('%s muestra un estado vacío honesto, sin datos inventados', (titulo, Pagina) => {
    render(
      <MemoryRouter>
        <Pagina />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: titulo })).toBeInTheDocument();
    expect(screen.getByText('Disponible próximamente')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
