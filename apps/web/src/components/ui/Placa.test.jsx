import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Placa } from '@/components/ui/Placa';

describe('Placa', () => {
  it('muestra la placa con el formato del panel', () => {
    render(<Placa placa="AAA111" />);

    expect(screen.getByText('AAA 111')).toBeInTheDocument();
  });
});
