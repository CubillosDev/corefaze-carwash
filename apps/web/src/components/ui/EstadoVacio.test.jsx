import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EstadoVacio } from '@/components/ui/EstadoVacio';

describe('EstadoVacio', () => {
  it('muestra título, descripción y acción', () => {
    render(
      <EstadoVacio
        titulo="Disponible próximamente"
        descripcion="La API todavía no ofrece esta información."
        accion={<button type="button">Volver</button>}
      />,
    );

    expect(screen.getByText('Disponible próximamente')).toBeInTheDocument();
    expect(screen.getByText('La API todavía no ofrece esta información.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Volver' })).toBeInTheDocument();
  });

  it('en su variante punteada solo muestra el título', () => {
    render(<EstadoVacio variante="punteado" titulo="Sin vehículos" descripcion="No se muestra" />);

    expect(screen.getByText('Sin vehículos')).toBeInTheDocument();
    expect(screen.queryByText('No se muestra')).not.toBeInTheDocument();
  });
});
