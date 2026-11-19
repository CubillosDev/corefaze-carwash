import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ModuloProximamente } from '@/components/ui/ModuloProximamente';

describe('ModuloProximamente', () => {
  it('conserva el encabezado y explica qué le falta a la API', () => {
    render(
      <ModuloProximamente
        titulo="Reportes"
        descripcion="Por periodo"
        motivo="La API todavía no entrega reportes."
        icono={null}
        accion={<a href="/jornadas">Ir a jornadas</a>}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Reportes' })).toBeInTheDocument();
    expect(screen.getByText('Disponible próximamente')).toBeInTheDocument();
    expect(screen.getByText('La API todavía no entrega reportes.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir a jornadas' })).toBeInTheDocument();
  });
});
