import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Alerta } from '@/components/ui/Alerta';

describe('Alerta', () => {
  it('anuncia los errores como alert', () => {
    render(
      <Alerta tipo="error" titulo="No pudimos guardar la orden">
        Revisa la conexión.
      </Alerta>,
    );

    const alerta = screen.getByRole('alert');
    expect(alerta).toHaveTextContent('No pudimos guardar la orden');
    expect(alerta).toHaveTextContent('Revisa la conexión.');
  });

  it('anuncia las advertencias como alert', () => {
    render(<Alerta tipo="advertencia" titulo="Faltan datos" />);

    expect(screen.getByRole('alert')).toHaveTextContent('Faltan datos');
  });

  it('anuncia el éxito y la información como status', () => {
    const { rerender } = render(<Alerta tipo="exito" titulo="Orden registrada" />);
    expect(screen.getByRole('status')).toHaveTextContent('Orden registrada');

    rerender(<Alerta tipo="info" titulo="Fundación técnica" />);
    expect(screen.getByRole('status')).toHaveTextContent('Fundación técnica');
  });

  it('solo muestra el botón de cerrar cuando recibe alCerrar', async () => {
    const alCerrar = vi.fn();
    const { rerender } = render(<Alerta tipo="info" titulo="Aviso" />);

    expect(screen.queryByRole('button', { name: 'Cerrar mensaje' })).not.toBeInTheDocument();

    rerender(<Alerta tipo="info" titulo="Aviso" alCerrar={alCerrar} />);
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar mensaje' }));

    expect(alCerrar).toHaveBeenCalledOnce();
  });
});
