import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CampoSeleccion } from '@/components/ui/CampoSeleccion';

const OPCIONES = [
  { valor: 'a', texto: 'Opción A' },
  { valor: 'b', texto: 'Opción B' },
];

describe('CampoSeleccion', () => {
  it('asocia la etiqueta con la lista y muestra las opciones', () => {
    render(<CampoSeleccion etiqueta="Tipo" opciones={OPCIONES} />);

    const lista = screen.getByLabelText('Tipo');

    expect(lista.tagName).toBe('SELECT');
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Opción A', 'Opción B']);
  });

  it('agrega una opción vacía cuando hay marcador', () => {
    render(<CampoSeleccion etiqueta="Tipo" opciones={OPCIONES} marcador="Selecciona..." />);

    expect(screen.getAllByRole('option')[0]).toHaveValue('');
    expect(screen.getAllByRole('option')[0]).toHaveTextContent('Selecciona...');
  });

  it('marca el asterisco y required cuando es requerido', () => {
    render(<CampoSeleccion etiqueta="Tipo" opciones={OPCIONES} requerido />);

    expect(screen.getByLabelText(/tipo/i)).toBeRequired();
  });

  it('anuncia el error y la ayuda con aria-describedby y marca aria-invalid', () => {
    render(
      <CampoSeleccion etiqueta="Tipo" opciones={OPCIONES} error="Elige un tipo" ayuda="Ayuda" />,
    );

    const lista = screen.getByLabelText('Tipo');

    expect(lista).toHaveAttribute('aria-invalid', 'true');
    expect(lista).toHaveAccessibleDescription('Ayuda Elige un tipo');
  });

  it('no marca aria-invalid sin error', () => {
    render(<CampoSeleccion etiqueta="Tipo" opciones={OPCIONES} />);

    expect(screen.getByLabelText('Tipo')).not.toHaveAttribute('aria-invalid');
  });

  it('avisa el cambio de valor', async () => {
    const alCambiar = vi.fn();
    render(<CampoSeleccion etiqueta="Tipo" opciones={OPCIONES} defaultValue="a" onChange={alCambiar} />);

    await userEvent.selectOptions(screen.getByLabelText('Tipo'), 'b');

    expect(alCambiar).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Tipo')).toHaveValue('b');
  });
});
