import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Tabla } from '@/components/ui/Tabla';
import { formatoMoneda } from '@/utils/formatoMoneda';

const COLUMNAS = [
  { clave: 'servicio', titulo: 'Servicio' },
  {
    clave: 'precio',
    titulo: 'Precio',
    alineacion: 'derecha',
    render: (fila) => formatoMoneda(fila.precio),
  },
];

const FILAS = [
  { id: 1, servicio: 'Lavado general', precio: 28000 },
  { id: 2, servicio: 'Lavado y encerado', precio: 65000 },
];

describe('Tabla', () => {
  it('dibuja los encabezados y una fila por dato', () => {
    render(<Tabla columnas={COLUMNAS} filas={FILAS} descripcion="Servicios" />);

    expect(screen.getByRole('columnheader', { name: 'Servicio' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Precio' })).toBeInTheDocument();
    // Una fila de encabezado más una por servicio.
    expect(screen.getAllByRole('row')).toHaveLength(FILAS.length + 1);
    expect(screen.getByText('Lavado general')).toBeInTheDocument();
  });

  it('usa el render de la columna cuando se entrega', () => {
    render(<Tabla columnas={COLUMNAS} filas={FILAS} descripcion="Servicios" />);

    expect(screen.getByText('$ 28.000')).toBeInTheDocument();
    expect(screen.getByText('$ 65.000')).toBeInTheDocument();
  });

  it('muestra el estado vacío ocupando todas las columnas', () => {
    render(
      <Tabla
        columnas={COLUMNAS}
        filas={[]}
        descripcion="Servicios"
        mensajeVacio="No hay servicios que coincidan."
      />,
    );

    const celda = screen.getByRole('cell', { name: 'No hay servicios que coincidan.' });

    expect(celda).toBeInTheDocument();
    expect(celda).toHaveAttribute('colspan', String(COLUMNAS.length));
  });

  it('se puede desplazar de lado con el teclado', () => {
    render(<Tabla columnas={COLUMNAS} filas={FILAS} descripcion="Servicios de la sede" />);

    const region = screen.getByRole('region', { name: 'Servicios de la sede' });

    expect(region).toHaveAttribute('tabindex', '0');
    expect(region).toHaveClass('overflow-x-auto');
  });

  it('se apoya en claveFila para identificar cada fila', () => {
    const filasConOtraLlave = [{ placa: 'ABC123', servicio: 'Lavado general', precio: 28000 }];

    render(
      <Tabla
        columnas={COLUMNAS}
        filas={filasConOtraLlave}
        claveFila="placa"
        descripcion="Servicios"
      />,
    );

    expect(screen.getByText('Lavado general')).toBeInTheDocument();
  });
});
