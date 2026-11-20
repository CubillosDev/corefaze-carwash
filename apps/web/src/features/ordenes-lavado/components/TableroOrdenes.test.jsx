import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TableroOrdenes } from '@/features/ordenes-lavado/components/TableroOrdenes';

const orden = (id, estado) => ({ id, estado, turno: id, vehiculoId: id });
const datosDe = (o) => ({
  vehiculo: { placa: `AAA${o.id}00`.slice(0, 6), marca: 'Mazda', tipoVehiculo: 'automovil' },
  servicio: { nombre: 'Lavado simple' },
  colaborador: { codigo: 401, nombre: 'Colaborador Prueba' },
});

let columnaBajoElPuntero = null;

function renderizar(ordenes) {
  const props = {
    ordenes,
    datosDe,
    puedeAnular: false,
    ordenOcupada: null,
    alCambiarEstado: vi.fn().mockResolvedValue(true),
    alCobrar: vi.fn(),
    alAvisar: vi.fn(),
  };
  render(
    <MemoryRouter>
      <TableroOrdenes {...props} />
    </MemoryRouter>,
  );
  return props;
}

/** Arrastra la tarjeta de la orden hasta la columna indicada y la suelta. */
function arrastrar(placaVisible, columna) {
  const tarjeta = screen.getByRole('link', { name: new RegExp(`Ver la orden de ${placaVisible}`) }).closest('article');
  columnaBajoElPuntero = screen.getByRole('region', { name: columna });
  fireEvent.pointerDown(tarjeta, { pointerType: 'mouse', button: 0, clientX: 20, clientY: 20 });
  fireEvent.pointerMove(window, { clientX: 80, clientY: 30 });
  fireEvent.pointerUp(window, { clientX: 80, clientY: 30 });
}

beforeEach(() => {
  document.elementFromPoint = () => columnaBajoElPuntero;
});

afterEach(() => {
  delete document.elementFromPoint;
  columnaBajoElPuntero = null;
});

describe('TableroOrdenes: arrastrar y soltar', () => {
  it('pasa la orden a la fase siguiente', async () => {
    const props = renderizar([orden(1, 'registrada')]);
    arrastrar('AAA 100', 'En proceso');
    await waitFor(() => expect(props.alCambiarEstado).toHaveBeenCalledWith(props.ordenes[0], 'en_proceso'));
    expect(props.alAvisar).not.toHaveBeenCalled();
  });

  it('no salta fases y explica por qué', async () => {
    const props = renderizar([orden(1, 'registrada')]);
    arrastrar('AAA 100', 'Terminada');
    await waitFor(() => expect(props.alAvisar).toHaveBeenCalledWith('Registrada solo puede pasar a En proceso'));
    expect(props.alCambiarEstado).not.toHaveBeenCalled();
  });

  it('devuelve una orden a la fase anterior', async () => {
    const props = renderizar([orden(3, 'en_proceso')]);
    arrastrar('AAA 300', 'Registrada');
    await waitFor(() => expect(props.alCambiarEstado).toHaveBeenCalledWith(props.ordenes[0], 'registrada'));
  });

  it('soltar una orden terminada en Entregada lleva a cobrarla en caja', async () => {
    const props = renderizar([orden(2, 'terminada')]);
    arrastrar('AAA 200', 'Entregada');
    await waitFor(() => expect(props.alCobrar).toHaveBeenCalledWith(props.ordenes[0]));
    expect(props.alCambiarEstado).not.toHaveBeenCalled();
  });

  it('un clic sin mover no arrastra', () => {
    const props = renderizar([orden(1, 'registrada')]);
    const tarjeta = screen.getByRole('link', { name: /Ver la orden de AAA 100/ }).closest('article');
    fireEvent.pointerDown(tarjeta, { pointerType: 'mouse', button: 0, clientX: 20, clientY: 20 });
    fireEvent.pointerUp(window, { clientX: 21, clientY: 20 });
    expect(props.alCambiarEstado).not.toHaveBeenCalled();
    expect(props.alAvisar).not.toHaveBeenCalled();
  });
});
