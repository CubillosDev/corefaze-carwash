import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EstadoVacio } from '@/components/ui/EstadoVacio';

describe('EstadoVacio', () => {
  it('muestra título, descripción y acción', () => {
    render(
      <EstadoVacio
        titulo="Sin resultados"
        descripcion="No hay movimientos que coincidan con la búsqueda."
        accion={<button type="button">Volver</button>}
      />,
    );

    expect(screen.getByText('Sin resultados')).toBeInTheDocument();
    expect(screen.getByText('No hay movimientos que coincidan con la búsqueda.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Volver' })).toBeInTheDocument();
  });

  it('en su variante punteada solo muestra el título', () => {
    render(<EstadoVacio variante="punteado" titulo="Sin vehículos" descripcion="No se muestra" />);

    expect(screen.getByText('Sin vehículos')).toBeInTheDocument();
    expect(screen.queryByText('No se muestra')).not.toBeInTheDocument();
  });
});
