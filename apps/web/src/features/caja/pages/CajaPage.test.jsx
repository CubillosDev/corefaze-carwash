import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProveedorSesion } from '@/features/autenticacion';
import {
  abrirCaja,
  cerrarCaja,
  obtenerDatosNegocio,
  obtenerEstadoCaja,
  registrarCobro,
  registrarEgreso,
} from '@/features/caja/api/caja.api';
import { CajaPage } from '@/features/caja/pages/CajaPage';
import { listarEmpresasCredito } from '@/features/credito/api/credito.api';
import { ErrorHttp } from '@/lib/httpCliente';

vi.mock('@/features/caja/api/caja.api', () => ({
  obtenerEstadoCaja: vi.fn(),
  obtenerDatosNegocio: vi.fn(),
  abrirCaja: vi.fn(),
  registrarCobro: vi.fn(),
  registrarEgreso: vi.fn(),
  cerrarCaja: vi.fn(),
  reabrirCaja: vi.fn(),
}));

vi.mock('@/features/credito/api/credito.api', () => ({ listarEmpresasCredito: vi.fn() }));

const ORDEN = {
  id: 7,
  turno: 3,
  valor: 22000,
  estado: 'terminada',
  medioPago: 'efectivo',
  clienteId: null,
  vehiculo: { placa: 'AAA111', marca: 'Mazda', tipoVehiculo: 'automovil', cliente: { id: 9, nombre: 'Ana Prueba', tipo: 'particular' } },
  servicio: { id: 1, numero: 1, nombre: 'Lavado simple' },
  colaborador: { id: 2, codigo: 405, nombre: 'Colaborador Prueba' },
};

const TOTALES = {
  cobrado: 0,
  cobros: 0,
  ticketPromedio: 0,
  porMedio: { efectivo: 0, nequi: 0, daviplata: 0, bancolombia: 0, datafono: 0, credito: 0 },
  egresos: 0,
  efectivoEsperado: 100000,
  porCobrar: 22000,
  vehiculosPorCobrar: 1,
};

const CAJA_ABIERTA = { id: 4, estado: 'abierta', baseInicial: 100000, abiertaEn: '2026-11-18T12:00:00Z' };

const estado = (cambios = {}) => ({
  jornada: { id: 1, fecha: '2026-11-18', estado: 'abierta' },
  caja: CAJA_ABIERTA,
  totales: TOTALES,
  porCobrar: [ORDEN],
  enPatio: [],
  cobros: [],
  egresos: [],
  ...cambios,
});

function renderizar(ruta = '/caja') {
  render(
    <ProveedorSesion sesionInicial={{ usuario: { id: 1, nombre: 'Ana', email: 'a@prueba.co', rol: 'soporte' }, token: 't' }}>
      <MemoryRouter initialEntries={[ruta]}>
        <CajaPage />
      </MemoryRouter>
    </ProveedorSesion>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  listarEmpresasCredito.mockResolvedValue([]);
  obtenerDatosNegocio.mockResolvedValue({ nombreNegocio: 'Lavadero Prueba', nit: '900000000-1' });
});

describe('CajaPage', () => {
  it('muestra los indicadores del servidor y pide elegir un vehículo', async () => {
    obtenerEstadoCaja.mockResolvedValue(estado());
    renderizar();

    expect(await screen.findByText('Efectivo en caja')).toBeInTheDocument();
    expect(screen.getByText('$ 100.000')).toBeInTheDocument();
    expect(screen.getByText('Selecciona un vehículo')).toBeInTheDocument();
  });

  it('cobra en efectivo sin enviar el valor y muestra el cambio que devolvió el servidor', async () => {
    const usuario = userEvent.setup();
    obtenerEstadoCaja.mockResolvedValue(estado());
    registrarCobro.mockResolvedValue({
      id: 15,
      medioPago: 'efectivo',
      valor: 22000,
      recibido: 30000,
      cambio: 8000,
      creadoEn: '2026-11-18T15:00:00Z',
      orden: ORDEN,
    });
    renderizar();

    await usuario.click(await screen.findByRole('button', { name: /AAA 111/ }));
    await usuario.click(screen.getByRole('button', { name: '$30k' }));
    expect(screen.getAllByText('$ 8.000').length).toBeGreaterThan(0);

    await usuario.click(screen.getByRole('button', { name: 'Cobrar $ 22.000' }));

    expect(registrarCobro).toHaveBeenCalledWith({
      ordenId: 7,
      medioPago: 'efectivo',
      recibido: 30000,
      clienteId: null,
      numeroVale: null,
    });
    expect(await screen.findByText('Cobro registrado')).toBeInTheDocument();
    expect(screen.getByText('Entrega de cambio')).toBeInTheDocument();
  });

  it('a crédito exige la empresa y el vale', async () => {
    const usuario = userEvent.setup();
    listarEmpresasCredito.mockResolvedValue([
      { id: 30, nombre: 'Empresa Ficticia S.A.S.', creditoHabilitado: true, estado: 'activo', saldoPendiente: 50000, cupoCredito: 1000000 },
    ]);
    obtenerEstadoCaja.mockResolvedValue(estado());
    registrarCobro.mockResolvedValue({ id: 16, medioPago: 'credito', valor: 22000, recibido: null, cambio: null, creadoEn: '2026-11-18T15:00:00Z', orden: ORDEN });
    renderizar('/caja?orden=7');

    await screen.findByText('Total a cobrar');
    await usuario.click(within(screen.getByRole('group', { name: 'Medio de pago' })).getByRole('button', { name: 'Crédito' }));
    const cargar = screen.getByRole('button', { name: 'Cargar a crédito $ 22.000' });
    expect(cargar).toBeDisabled();

    await usuario.click(screen.getByRole('button', { name: 'Empresa Ficticia' }));
    await usuario.type(screen.getByPlaceholderText('Ej. TA-1234'), 'ef-12');
    expect(screen.getByText(/Saldo actual \$ 50\.000 de \$ 1\.000\.000 de cupo/)).toBeInTheDocument();
    await usuario.click(cargar);

    expect(registrarCobro).toHaveBeenCalledWith({
      ordenId: 7,
      medioPago: 'credito',
      recibido: null,
      clienteId: 30,
      numeroVale: 'EF-12',
    });
  });

  it('muestra el error de la API al cobrar', async () => {
    const usuario = userEvent.setup();
    obtenerEstadoCaja.mockResolvedValue(estado());
    registrarCobro.mockRejectedValue(new ErrorHttp('La caja está cerrada: ábrela para registrar cobros', { estado: 409 }));
    renderizar('/caja?orden=7');

    await usuario.click(await screen.findByRole('button', { name: 'Cobrar $ 22.000' }));
    expect(await screen.findByText('La caja está cerrada: ábrela para registrar cobros')).toBeInTheDocument();
  });

  it('abre la caja con su base y registra un egreso', async () => {
    const usuario = userEvent.setup();
    obtenerEstadoCaja.mockResolvedValueOnce(estado({ caja: null })).mockResolvedValue(estado());
    abrirCaja.mockResolvedValue(CAJA_ABIERTA);
    registrarEgreso.mockResolvedValue({ id: 1 });
    renderizar();

    expect(await screen.findByText('Sin abrir')).toBeInTheDocument();
    expect(screen.getByText('La caja está cerrada')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Abrir caja' }));
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Abrir caja' }));
    expect(abrirCaja).toHaveBeenCalledWith(100000);

    await usuario.click(await screen.findByRole('button', { name: 'Registrar egreso' }));
    const dialogo = screen.getByRole('dialog');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Almuerzos' }));
    await usuario.type(within(dialogo).getByLabelText(/^Monto/), '18000');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Registrar egreso' }));
    expect(registrarEgreso).toHaveBeenCalledWith({ categoria: 'almuerzos', valor: 18000, concepto: null });
  });

  it('cierra la caja con el efectivo contado y muestra la diferencia', async () => {
    const usuario = userEvent.setup();
    obtenerEstadoCaja.mockResolvedValue(estado());
    cerrarCaja.mockResolvedValue({ ...CAJA_ABIERTA, estado: 'cerrada' });
    renderizar();

    await usuario.click(await screen.findByRole('button', { name: 'Cerrar caja' }));
    const dialogo = screen.getByRole('dialog');
    await usuario.type(within(dialogo).getByLabelText(/^Efectivo contado/), '95000');
    expect(within(dialogo).getByText('Faltante')).toBeInTheDocument();
    expect(within(dialogo).getByText('−$ 5.000')).toBeInTheDocument();
    await usuario.click(within(dialogo).getByRole('button', { name: 'Confirmar cierre' }));
    expect(cerrarCaja).toHaveBeenCalledWith(95000);
  });

  it('sin jornadas lleva a abrir una', async () => {
    obtenerEstadoCaja.mockResolvedValue(estado({ jornada: null, caja: null, porCobrar: [] }));
    renderizar();
    expect(await screen.findByText('Aún no hay jornadas')).toBeInTheDocument();
  });
});
