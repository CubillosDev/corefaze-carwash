import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { CampoTexto } from '@/components/ui/CampoTexto';

describe('CampoTexto', () => {
  it('asocia la etiqueta con el campo', async () => {
    render(<CampoTexto etiqueta="Placa del vehículo" />);

    const campo = screen.getByLabelText('Placa del vehículo');
    await userEvent.type(campo, 'ABC123');

    expect(campo).toHaveValue('ABC123');
  });

  it('anuncia la ayuda y el error por aria-describedby', () => {
    render(
      <CampoTexto etiqueta="Correo" ayuda="Debe incluir una arroba." error="Escribe un correo válido." />,
    );

    const campo = screen.getByLabelText('Correo');

    expect(campo).toHaveAttribute('aria-invalid', 'true');
    expect(campo).toHaveAccessibleDescription('Debe incluir una arroba. Escribe un correo válido.');
  });

  it('no se marca como inválido cuando no hay error', () => {
    render(<CampoTexto etiqueta="Correo" ayuda="Debe incluir una arroba." />);

    const campo = screen.getByLabelText('Correo');

    expect(campo).not.toHaveAttribute('aria-invalid');
    expect(campo).toHaveAccessibleDescription('Debe incluir una arroba.');
  });

  it('marca el campo como obligatorio', () => {
    render(<CampoTexto etiqueta="Placa" requerido />);

    expect(screen.getByLabelText(/Placa/)).toBeRequired();
  });

  it('genera identificadores distintos para cada campo', () => {
    render(
      <>
        <CampoTexto etiqueta="Placa" ayuda="Sin guiones." />
        <CampoTexto etiqueta="Color" ayuda="En español." />
      </>,
    );

    const placa = screen.getByLabelText('Placa');
    const color = screen.getByLabelText('Color');

    expect(placa.id).not.toBe(color.id);
    expect(placa).toHaveAccessibleDescription('Sin guiones.');
    expect(color).toHaveAccessibleDescription('En español.');
  });

  it('respeta el identificador que se le entregue', () => {
    render(<CampoTexto id="placa-vehiculo" etiqueta="Placa" />);

    expect(screen.getByLabelText('Placa')).toHaveAttribute('id', 'placa-vehiculo');
  });
});
