import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { BotonAyuda } from '@/components/layout/BotonAyuda';

describe('BotonAyuda', () => {
  it('abre las preguntas frecuentes y despliega una respuesta', async () => {
    const usuario = userEvent.setup();
    render(<BotonAyuda />);

    const boton = screen.getByRole('button', { name: 'Ayuda' });
    expect(boton).toHaveAttribute('aria-expanded', 'false');
    await usuario.click(boton);

    const panel = screen.getByRole('dialog', { name: 'Soporte Corefaze' });
    expect(within(panel).getByRole('searchbox', { name: 'Buscar en preguntas frecuentes' })).toHaveFocus();

    const pregunta = within(panel).getByRole('button', { name: '¿Cómo hago el cierre de caja?' });
    await usuario.click(pregunta);
    expect(pregunta).toHaveAttribute('aria-expanded', 'true');
    expect(within(panel).getByText(/escribe el efectivo contado/)).toBeInTheDocument();
  });

  it('busca sin importar tildes ni mayúsculas', async () => {
    const usuario = userEvent.setup();
    render(<BotonAyuda />);
    await usuario.click(screen.getByRole('button', { name: 'Ayuda' }));
    const panel = screen.getByRole('dialog');

    await usuario.type(within(panel).getByRole('searchbox'), 'CREDITO');
    expect(within(panel).getByRole('button', { name: '¿Cómo cargo un servicio a crédito?' })).toBeInTheDocument();
    expect(within(panel).queryByRole('button', { name: '¿Cómo hago el cierre de caja?' })).not.toBeInTheDocument();

    await usuario.clear(within(panel).getByRole('searchbox'));
    await usuario.type(within(panel).getByRole('searchbox'), 'xyz sin resultado');
    expect(within(panel).getByText('No encontramos esa pregunta.')).toBeInTheDocument();
  });

  it('se cierra con Escape y devuelve el foco al botón', async () => {
    const usuario = userEvent.setup();
    render(<BotonAyuda />);
    await usuario.click(screen.getByRole('button', { name: 'Ayuda' }));

    await usuario.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ayuda' })).toHaveFocus();
  });
});
