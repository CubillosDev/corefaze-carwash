import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProveedorSesion } from '@/features/autenticacion';
import {
  crearInsumo,
  listarInsumos,
  listarMovimientos,
  moverInsumo,
} from '@/features/inventario/api/inventario.api';
import { InventarioPage } from '@/features/inventario/pages/InventarioPage';
import { ErrorHttp } from '@/lib/httpCliente';

vi.mock('@/features/inventario/api/inventario.api', () => ({
  listarInsumos: vi.fn(),
  crearInsumo: vi.fn(),
  actualizarInsumo: vi.fn(),
  cambiarEstadoInsumo: vi.fn(),
  moverInsumo: vi.fn(),
  listarMovimientos: vi.fn(),
}));

const SHAMPOO = {
  id: 1,
  nombre: 'Shampoo de prueba',
  categoria: 'Lavado exterior',
  unidad: 'litros',
  stock: 4,
  stockMinimo: 6,
  stockBajo: true,
  estado: 'activo',
};
const TOALLAS = { ...SHAMPOO, id: 2, nombre: 'Toallas de prueba', unidad: 'unidades', stock: 40, stockMinimo: 10, stockBajo: false };

function renderizar(rol = 'administrador') {
  render(
    <ProveedorSesion sesionInicial={{ usuario: { id: 1, nombre: 'Ana', email: 'a@prueba.co', rol }, token: 't' }}>
      <InventarioPage />
    </ProveedorSesion>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  listarInsumos.mockResolvedValue([SHAMPOO, TOALLAS]);
  listarMovimientos.mockResolvedValue([]);
});

describe('InventarioPage', () => {
  it('avisa el stock bajo que decide el servidor y filtra por él', async () => {
    const usuario = userEvent.setup();
    renderizar();

    expect(await screen.findByText('Stock bajo')).toBeInTheDocument();
    expect(screen.getByText('Toallas de prueba')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Stock bajo 1' }));
    expect(screen.queryByText('Toallas de prueba')).not.toBeInTheDocument();
  });

  it('suma una unidad con el botón + y muestra el stock que devolvió el servidor', async () => {
    const usuario = userEvent.setup();
    moverInsumo.mockResolvedValue({ ...SHAMPOO, stock: 5 });
    renderizar('soporte');

    await usuario.click(await screen.findByRole('button', { name: 'Sumar 1 a Shampoo de prueba' }));

    expect(moverInsumo).toHaveBeenCalledWith(1, 1);
    expect(await screen.findByText('5')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nuevo insumo' })).not.toBeInTheDocument();
  });

  it('muestra el error si el stock quedaría en negativo', async () => {
    const usuario = userEvent.setup();
    moverInsumo.mockRejectedValue(new ErrorHttp('El stock de Shampoo de prueba no puede quedar en negativo', { estado: 409 }));
    renderizar();

    await usuario.click(await screen.findByRole('button', { name: 'Restar 1 a Shampoo de prueba' }));
    expect(await screen.findByText('El stock de Shampoo de prueba no puede quedar en negativo')).toBeInTheDocument();
  });

  it('crea un insumo con su stock inicial', async () => {
    const usuario = userEvent.setup();
    crearInsumo.mockResolvedValue({ ...TOALLAS, id: 3, nombre: 'Cera de prueba' });
    renderizar();

    await usuario.click(await screen.findByRole('button', { name: 'Nuevo insumo' }));
    const dialogo = screen.getByRole('dialog');
    await usuario.type(within(dialogo).getByLabelText(/^Nombre/), 'Cera de prueba');
    await usuario.type(within(dialogo).getByLabelText(/^Categoría/), 'Protección');
    await usuario.type(within(dialogo).getByLabelText(/^Unidad/), 'frascos');
    await usuario.type(within(dialogo).getByLabelText('Stock mínimo'), '6');
    await usuario.type(within(dialogo).getByLabelText('Stock inicial'), '4');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Crear insumo' }));

    expect(crearInsumo).toHaveBeenCalledWith({
      nombre: 'Cera de prueba',
      categoria: 'Protección',
      unidad: 'frascos',
      stockMinimo: 6,
      stockInicial: 4,
    });
    expect(await screen.findByText('Cera de prueba')).toBeInTheDocument();
  });
});
