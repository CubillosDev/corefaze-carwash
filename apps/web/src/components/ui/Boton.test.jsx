import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Boton } from '@/components/ui/Boton';

describe('Boton', () => {
  it('muestra su contenido y responde al clic', async () => {
    const alHacerClic = vi.fn();
    render(<Boton onClick={alHacerClic}>Guardar orden</Boton>);

    await userEvent.click(screen.getByRole('button', { name: 'Guardar orden' }));

    expect(alHacerClic).toHaveBeenCalledOnce();
  });

  it('es de tipo button por defecto, para no enviar formularios sin querer', () => {
    render(<Boton>Guardar</Boton>);

    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('permite declararse como botón de envío', () => {
    render(<Boton type="submit">Enviar</Boton>);

    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  it('mientras carga queda deshabilitado, marcado como ocupado y no dispara la acción', async () => {
    const alHacerClic = vi.fn();
    render(
      <Boton cargando onClick={alHacerClic}>
        Guardando
      </Boton>,
    );

    const boton = screen.getByRole('button', { name: 'Guardando' });

    expect(boton).toBeDisabled();
    expect(boton).toHaveAttribute('aria-busy', 'true');

    await userEvent.click(boton);
    expect(alHacerClic).not.toHaveBeenCalled();
  });

  it('no dispara la acción cuando está deshabilitado', async () => {
    const alHacerClic = vi.fn();
    render(
      <Boton disabled onClick={alHacerClic}>
        Anular
      </Boton>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Anular' }));

    expect(alHacerClic).not.toHaveBeenCalled();
  });

  it('no marca aria-busy cuando no está cargando', () => {
    render(<Boton>Guardar</Boton>);

    expect(screen.getByRole('button')).not.toHaveAttribute('aria-busy');
  });

  it('aplica el color de cada variante', () => {
    const { rerender } = render(<Boton variante="peligro">Anular</Boton>);
    expect(screen.getByRole('button')).toHaveClass('bg-acento');

    rerender(<Boton variante="fantasma">Ver detalle</Boton>);
    expect(screen.getByRole('button')).toHaveClass('bg-transparent');

    rerender(<Boton variante="primario">Guardar</Boton>);
    expect(screen.getByRole('button')).toHaveClass('bg-primario');
  });

  it('aplica la altura de cada tamaño', () => {
    const { rerender } = render(<Boton tamano="pequeno">Pequeño</Boton>);
    expect(screen.getByRole('button')).toHaveClass('h-8');

    rerender(<Boton tamano="grande">Grande</Boton>);
    expect(screen.getByRole('button')).toHaveClass('h-12');
  });
});
