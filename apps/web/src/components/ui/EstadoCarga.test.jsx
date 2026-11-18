import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EstadoCarga } from '@/components/ui/EstadoCarga';

describe('EstadoCarga', () => {
  it('se anuncia como estado con su texto', () => {
    render(<EstadoCarga texto="Cargando órdenes…" />);

    expect(screen.getByRole('status')).toHaveTextContent('Cargando órdenes…');
  });
});
