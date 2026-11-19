import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProveedorSesion } from '@/features/autenticacion';
import { crearCliente } from '@/features/clientes/api/clientes.api';
import {
  actualizarCondiciones,
  listarEmpresasCredito,
  listarOrdenesEmpresa,
  marcarVale,
  registrarPagoCredito,
  verificarVale,
} from '@/features/credito/api/credito.api';
import { CreditoPage } from '@/features/credito/pages/CreditoPage';

vi.mock('@/features/credito/api/credito.api', () => ({
  listarEmpresasCredito: vi.fn(),
  listarOrdenesEmpresa: vi.fn(),
  actualizarCondiciones: vi.fn(),
  verificarVale: vi.fn(),
  marcarVale: vi.fn(),
  registrarVale: vi.fn(),
  registrarPagoCredito: vi.fn(),
}));

vi.mock('@/features/clientes/api/clientes.api', () => ({ crearCliente: vi.fn(), listarClientes: vi.fn() }));

const EMPRESA = {
  id: 30,
  nombre: 'Empresa Ficticia S.A.S.',
  documento: '900000030',
  telefono: '3000000030',
  estado: 'activo',
  creditoHabilitado: true,
  cupoCredito: 1000000,
  diaCorte: 30,
  contacto: 'Ana Prueba',
  saldoPendiente: 50000,
  saldoPagable: 50000,
  cantidadOrdenesPagables: 2,
};

const orden = (id, vale) => ({
  id,
  fecha: '2026-11-18',
  turno: id,
  valor: 25000,
  estado: 'entregada',
  vehiculo: { placa: 'AAA111' },
  servicio: { nombre: 'Lavado simple' },
  vale,
});

function renderizar(rol = 'administrador') {
  render(
    <ProveedorSesion sesionInicial={{ usuario: { id: 1, nombre: 'Ana', email: 'a@prueba.co', rol }, token: 't' }}>
      <MemoryRouter>
        <CreditoPage />
      </MemoryRouter>
    </ProveedorSesion>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  listarEmpresasCredito.mockResolvedValue([EMPRESA]);
  listarOrdenesEmpresa.mockImplementation(async (_id, tipo) =>
    tipo === 'pendientes'
      ? [orden(1, { numero: 'EF-1', verificadoEn: '2026-11-18T15:00:00Z' }), orden(2, { numero: 'EF-2', verificadoEn: null })]
      : [],
  );
});

describe('CreditoPage', () => {
  it('muestra la empresa con su saldo del servidor y los vales verificados', async () => {
    renderizar();

    expect(await screen.findByRole('heading', { name: 'Empresa Ficticia S.A.S.' })).toBeInTheDocument();
    expect(await screen.findByText('1 de 2')).toBeInTheDocument();
    expect(screen.getByText('$ 950.000')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Vale EF-1 recibido' })).toHaveAttribute('aria-checked', 'true');
  });

  it('verifica un vale por su número y muestra si coincide', async () => {
    const usuario = userEvent.setup();
    verificarVale.mockResolvedValue({
      resultado: 'coincide',
      vale: { numero: 'EF-2', orden: { valor: 25000, vehiculo: { placa: 'AAA111' }, servicio: { nombre: 'Lavado simple' } } },
    });
    renderizar('soporte');

    await usuario.type(await screen.findByLabelText('Número de vale'), 'ef-2');
    await usuario.click(screen.getByRole('button', { name: 'Verificar' }));

    expect(verificarVale).toHaveBeenCalledWith(30, 'EF-2');
    expect(await screen.findByText('Vale EF-2 coincide · AAA 111 · Lavado simple · $ 25.000')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Registrar pago' })).not.toBeInTheDocument();
  });

  it('marca un vale como recibido', async () => {
    const usuario = userEvent.setup();
    marcarVale.mockResolvedValue({});
    renderizar();

    await usuario.click(await screen.findByRole('checkbox', { name: 'Vale EF-2 recibido' }));
    expect(marcarVale).toHaveBeenCalledWith(2, true);
  });

  it('registra el pago de los servicios verificados con su medio', async () => {
    const usuario = userEvent.setup();
    registrarPagoCredito.mockResolvedValue({ id: 5 });
    renderizar();

    await usuario.click(await screen.findByRole('button', { name: 'Registrar pago' }));
    const dialogo = screen.getByRole('dialog');
    expect(within(dialogo).getByText(/Quedarán 1 servicio pendiente/)).toBeInTheDocument();
    await usuario.click(within(dialogo).getByRole('button', { name: 'Cheque' }));
    await usuario.click(within(dialogo).getByRole('button', { name: 'Confirmar pago' }));

    expect(registrarPagoCredito).toHaveBeenCalledWith({ clienteId: 30, ordenIds: [1], medio: 'cheque' });
  });

  it('crea una empresa con crédito y sus condiciones', async () => {
    const usuario = userEvent.setup();
    crearCliente.mockResolvedValue({ id: 31 });
    actualizarCondiciones.mockResolvedValue({});
    renderizar();

    await usuario.click(await screen.findByRole('button', { name: 'Nueva empresa' }));
    const dialogo = screen.getByRole('dialog');
    await usuario.type(within(dialogo).getByLabelText(/^Razón social/), 'Otra Empresa S.A.S.');
    await usuario.type(within(dialogo).getByLabelText(/^NIT/), '900111222');
    await usuario.type(within(dialogo).getByLabelText(/^Teléfono/), '3001112222');
    await usuario.click(within(dialogo).getByRole('button', { name: '$2 M' }));
    await usuario.click(within(dialogo).getByRole('button', { name: 'Día 15' }));
    await usuario.click(within(dialogo).getByRole('button', { name: 'Crear empresa' }));

    expect(crearCliente).toHaveBeenCalledWith({
      nombre: 'Otra Empresa S.A.S.',
      documento: '900111222',
      telefono: '3001112222',
      tipo: 'empresa',
      creditoHabilitado: true,
    });
    expect(actualizarCondiciones).toHaveBeenCalledWith(31, { cupoCredito: 2000000, diaCorte: 15, contacto: null });
  });

  it('soporte no crea empresas ni paga', async () => {
    renderizar('soporte');
    await screen.findByRole('heading', { name: 'Empresa Ficticia S.A.S.' });
    expect(screen.queryByRole('button', { name: 'Nueva empresa' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Condiciones' })).not.toBeInTheDocument();
  });
});
