import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { TablaOrdenes } from '@/features/ordenes-lavado/components/TablaOrdenes';

const datosDe = () => ({
  vehiculo: { placa: 'AAA111', marca: 'Marca Prueba', tipoVehiculo: 'automovil' },
  servicio: { nombre: 'Lavado de prueba' },
  colaborador: { nombre: 'Colaborador Prueba' },
});

describe('TablaOrdenes', () => {
  it('lista las órdenes de lavado con su placa, servicio, estado y valor', () => {
    render(
      <MemoryRouter>
        <TablaOrdenes ordenes={[{ id: 5, turno: 2, estado: 'terminada', valor: 35000 }]} datosDe={datosDe} />
      </MemoryRouter>,
    );

    const fila = screen.getAllByRole('row')[1];
    expect(within(fila).getByRole('link', { name: 'Ver la orden de AAA 111' })).toHaveAttribute(
      'href',
      '/ordenes-lavado/5',
    );
    expect(within(fila).getByText('Lavado de prueba')).toBeInTheDocument();
    expect(within(fila).getByText('Terminada')).toBeInTheDocument();
    expect(within(fila).getByText('$ 35.000')).toBeInTheDocument();
  });

  it('dice que no hay órdenes cuando la jornada está vacía', () => {
    render(
      <MemoryRouter>
        <TablaOrdenes ordenes={[]} datosDe={datosDe} />
      </MemoryRouter>,
    );

    expect(screen.getByText('No hay órdenes en esta jornada.')).toBeInTheDocument();
  });
});
