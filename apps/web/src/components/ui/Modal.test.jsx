import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Modal } from '@/components/ui/Modal';

/** Botón que abre la ventana, para poder comprobar a dónde vuelve el foco. */
function ModalConDisparador() {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setAbierto(true)}>
        Abrir la ventana
      </button>
      <Modal abierto={abierto} alCerrar={() => setAbierto(false)} titulo="Anular la orden">
        <button type="button">Acción de adentro</button>
      </Modal>
    </>
  );
}

function velo() {
  return document.querySelector('button[aria-hidden="true"]');
}

describe('Modal', () => {
  it('no dibuja nada mientras está cerrada', () => {
    render(
      <Modal abierto={false} alCerrar={vi.fn()} titulo="Anular la orden">
        Contenido
      </Modal>,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('se anuncia como diálogo modal con su título', () => {
    render(
      <Modal abierto alCerrar={vi.fn()} titulo="Anular la orden">
        Contenido
      </Modal>,
    );

    const dialogo = screen.getByRole('dialog');

    expect(dialogo).toHaveAttribute('aria-modal', 'true');
    expect(dialogo).toHaveAccessibleName('Anular la orden');
  });

  it('se dibuja fuera del contenedor de la aplicación, en un portal sobre el body', () => {
    const { container } = render(
      <Modal abierto alCerrar={vi.fn()} titulo="Anular la orden">
        Contenido
      </Modal>,
    );

    expect(container).toBeEmptyDOMElement();
    expect(document.body).toContainElement(screen.getByRole('dialog'));
  });

  it('se cierra con Escape', async () => {
    const alCerrar = vi.fn();
    render(
      <Modal abierto alCerrar={alCerrar} titulo="Anular la orden">
        Contenido
      </Modal>,
    );

    await userEvent.keyboard('{Escape}');

    expect(alCerrar).toHaveBeenCalledOnce();
  });

  it('se cierra con el botón de cerrar y con un clic por fuera', async () => {
    const alCerrar = vi.fn();
    render(
      <Modal abierto alCerrar={alCerrar} titulo="Anular la orden">
        Contenido
      </Modal>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar ventana' }));
    expect(alCerrar).toHaveBeenCalledOnce();

    await userEvent.click(velo());
    expect(alCerrar).toHaveBeenCalledTimes(2);
  });

  it('lleva el foco adentro al abrir y lo devuelve al cerrar', async () => {
    render(<ModalConDisparador />);

    const disparador = screen.getByRole('button', { name: 'Abrir la ventana' });
    await userEvent.click(disparador);

    expect(screen.getByRole('button', { name: 'Cerrar ventana' })).toHaveFocus();

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(disparador).toHaveFocus();
  });

  it('atrapa el foco: al tabular desde el último elemento vuelve al primero', async () => {
    render(<ModalConDisparador />);

    await userEvent.click(screen.getByRole('button', { name: 'Abrir la ventana' }));

    const cerrar = screen.getByRole('button', { name: 'Cerrar ventana' });
    const interno = screen.getByRole('button', { name: 'Acción de adentro' });

    expect(cerrar).toHaveFocus();

    await userEvent.tab();
    expect(interno).toHaveFocus();

    await userEvent.tab();
    expect(cerrar).toHaveFocus();

    await userEvent.tab({ shift: true });
    expect(interno).toHaveFocus();
  });

  it('muestra las acciones del pie cuando se entregan', () => {
    render(
      <Modal
        abierto
        alCerrar={vi.fn()}
        titulo="Anular la orden"
        pie={<button type="button">Anular</button>}
      >
        Contenido
      </Modal>,
    );

    expect(screen.getByRole('button', { name: 'Anular' })).toBeInTheDocument();
  });
});
