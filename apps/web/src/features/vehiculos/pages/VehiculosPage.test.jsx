import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProveedorSesion } from '@/features/autenticacion';
import { listarClientes } from '@/features/clientes';
import { listarOrdenesDeVehiculo } from '@/features/ordenes-lavado';
import { listarServicios } from '@/features/servicios';
import {
  actualizarVehiculo,
  crearVehiculo,
  eliminarVehiculo,
  listarVehiculos,
} from '@/features/vehiculos/api/vehiculos.api';
import { VehiculosPage } from '@/features/vehiculos/pages/VehiculosPage';
import { ErrorHttp } from '@/lib/httpCliente';

vi.mock('@/features/vehiculos/api/vehiculos.api', () => ({
  listarVehiculos: vi.fn(),
  crearVehiculo: vi.fn(),
  actualizarVehiculo: vi.fn(),
  eliminarVehiculo: vi.fn(),
}));
vi.mock('@/features/clientes', () => ({ listarClientes: vi.fn() }));
vi.mock('@/features/servicios', () => ({ listarServicios: vi.fn() }));
vi.mock('@/features/ordenes-lavado', () => ({ listarOrdenesDeVehiculo: vi.fn() }));

const CLIENTES = [
  { id: 1, nombre: 'Cliente Uno' },
  { id: 2, nombre: 'Cliente Dos' },
];
const MAZDA = { id: 1, placa: 'ABC123', tipoVehiculo: 'automovil', marca: 'Mazda', color: 'Rojo', clienteId: 1 };
const MOTO = { id: 2, placa: 'XYZ98K', tipoVehiculo: 'moto_hasta_150cc', marca: null, color: null, clienteId: 2 };

const sesionCon = (rol) => ({
  usuario: { id: 1, nombre: 'Persona de prueba', email: 'persona@lavadero.test', rol },
  token: 'token-de-prueba',
});

/** Monta la página con una sesión del rol indicado (por defecto, administrador). */
const renderPagina = (rol = 'administrador') =>
  render(
    <ProveedorSesion sesionInicial={sesionCon(rol)}>
      <VehiculosPage />
    </ProveedorSesion>,
  );

beforeEach(() => {
  vi.resetAllMocks();
  listarVehiculos.mockResolvedValue([MAZDA, MOTO]);
  listarClientes.mockResolvedValue(CLIENTES);
  listarServicios.mockResolvedValue([{ id: 10, nombre: 'Lavado general' }]);
  listarOrdenesDeVehiculo.mockResolvedValue([]);
});

const abrirPagina = async (rol) => {
  const usuario = userEvent.setup();
  renderPagina(rol);
  await screen.findByRole('table');
  return usuario;
};

const filaDe = (placa) => screen.getByText(placa).closest('tr');
const dialogo = () => screen.getByRole('dialog');

describe('VehiculosPage: lista', () => {
  it('muestra el estado de carga y luego los vehículos con placa formateada, tipo y cliente', async () => {
    renderPagina();

    expect(screen.getByRole('status')).toHaveTextContent('Cargando vehículos');

    expect(await screen.findByText('ABC 123')).toBeInTheDocument();
    const fila = filaDe('ABC 123');
    expect(within(fila).getByText('Automóvil')).toBeInTheDocument();
    expect(within(fila).getByText('Mazda')).toBeInTheDocument();
    expect(within(fila).getByText('Cliente Uno')).toBeInTheDocument();
    const filaMoto = filaDe('XYZ 98K');
    expect(within(filaMoto).getByText('Moto hasta 150 cc')).toBeInTheDocument();
    expect(within(filaMoto).getByText('Cliente Dos')).toBeInTheDocument();
    expect(screen.getByText('2 vehículos')).toBeInTheDocument();
  });

  it('muestra un mensaje cuando todavía no hay vehículos', async () => {
    listarVehiculos.mockResolvedValue([]);

    await abrirPagina();

    expect(screen.getByText(/todavía no hay vehículos registrados/i)).toBeInTheDocument();
  });

  it('muestra el error de carga y permite reintentar', async () => {
    listarVehiculos.mockRejectedValueOnce(new ErrorHttp('El servidor presentó un error.', { estado: 500 }));
    const usuario = userEvent.setup();
    renderPagina();

    expect(await screen.findByRole('alert')).toHaveTextContent('El servidor presentó un error.');

    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('ABC 123')).toBeInTheDocument();
    expect(listarVehiculos).toHaveBeenCalledTimes(2);
  });

  it('busca por placa sin importar mayúsculas, espacios o guiones', async () => {
    const usuario = await abrirPagina();
    const buscador = screen.getByLabelText('Buscar por placa');

    await usuario.type(buscador, 'abc-1');

    expect(screen.getByText('ABC 123')).toBeInTheDocument();
    expect(screen.queryByText('XYZ 98K')).not.toBeInTheDocument();
    expect(screen.getByText('1 de 2 vehículos')).toBeInTheDocument();
  });

  it('avisa cuando ninguna placa coincide con la búsqueda', async () => {
    const usuario = await abrirPagina();

    await usuario.type(screen.getByLabelText('Buscar por placa'), 'ZZZ');

    expect(screen.getByText('Ningún vehículo coincide con esa placa.')).toBeInTheDocument();
  });
});

describe('VehiculosPage: registrar', () => {
  it('valida el formulario sin llamar a la API', async () => {
    const usuario = await abrirPagina();
    await usuario.click(screen.getByRole('button', { name: 'Nuevo vehículo' }));

    await usuario.click(within(dialogo()).getByRole('button', { name: 'Registrar' }));

    expect(within(dialogo()).getByText('Escribe la placa.')).toBeInTheDocument();
    expect(within(dialogo()).getByText('Elige el tipo de vehículo.')).toBeInTheDocument();
    expect(within(dialogo()).getByText('Elige el cliente dueño del vehículo.')).toBeInTheDocument();
    expect(crearVehiculo).not.toHaveBeenCalled();
  });

  it('no deja registrar una placa de moto en un automóvil', async () => {
    const usuario = await abrirPagina();
    await usuario.click(screen.getByRole('button', { name: 'Nuevo vehículo' }));

    await usuario.type(screen.getByLabelText(/^placa/i), 'DEF45G');
    await usuario.selectOptions(screen.getByLabelText(/tipo de vehículo/i), 'automovil');
    await usuario.selectOptions(screen.getByLabelText(/^cliente/i), '1');
    await usuario.click(within(dialogo()).getByRole('button', { name: 'Registrar' }));

    expect(within(dialogo()).getByText('La placa no corresponde al formato de carro.')).toBeInTheDocument();
    expect(crearVehiculo).not.toHaveBeenCalled();
  });

  it('registra el vehículo, lo agrega a la tabla y avisa con un mensaje de éxito', async () => {
    const nuevo = { id: 3, placa: 'DEF456', tipoVehiculo: 'camioneta', marca: 'Kia', color: null, clienteId: 2 };
    crearVehiculo.mockResolvedValue(nuevo);
    const usuario = await abrirPagina();
    await usuario.click(screen.getByRole('button', { name: 'Nuevo vehículo' }));

    await usuario.type(screen.getByLabelText(/^placa/i), 'def 456');
    await usuario.selectOptions(screen.getByLabelText(/tipo de vehículo/i), 'camioneta');
    await usuario.type(screen.getByLabelText(/^marca/i), 'Kia');
    await usuario.selectOptions(screen.getByLabelText(/^cliente/i), '2');
    await usuario.click(within(dialogo()).getByRole('button', { name: 'Registrar' }));

    expect(crearVehiculo).toHaveBeenCalledWith({
      placa: 'DEF456',
      tipoVehiculo: 'camioneta',
      marca: 'Kia',
      clienteId: 2,
    });
    expect(await screen.findByText('DEF 456')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Vehículo DEF 456 registrado correctamente.');
  });

  it('muestra junto a la placa el error 409 de placa repetida y deja abierto el formulario', async () => {
    crearVehiculo.mockRejectedValue(
      new ErrorHttp('Ya existe un vehículo con esa placa', { estado: 409 }),
    );
    const usuario = await abrirPagina();
    await usuario.click(screen.getByRole('button', { name: 'Nuevo vehículo' }));

    await usuario.type(screen.getByLabelText(/^placa/i), 'ABC123');
    await usuario.selectOptions(screen.getByLabelText(/tipo de vehículo/i), 'automovil');
    await usuario.selectOptions(screen.getByLabelText(/^cliente/i), '1');
    await usuario.click(within(dialogo()).getByRole('button', { name: 'Registrar' }));

    expect(await within(dialogo()).findByText('Ya existe un vehículo con esa placa')).toBeInTheDocument();
    expect(screen.getByLabelText(/^placa/i)).toHaveAttribute('aria-invalid', 'true');
    expect(within(dialogo()).getByRole('button', { name: 'Registrar' })).toBeEnabled();
  });

  it('muestra los errores por campo que devuelve la API (400)', async () => {
    crearVehiculo.mockRejectedValue(
      new ErrorHttp('Hay datos que no son válidos.', {
        estado: 400,
        erroresPorCampo: { color: 'color debe tener entre 2 y 30 caracteres' },
      }),
    );
    const usuario = await abrirPagina();
    await usuario.click(screen.getByRole('button', { name: 'Nuevo vehículo' }));

    await usuario.type(screen.getByLabelText(/^placa/i), 'ABC999');
    await usuario.selectOptions(screen.getByLabelText(/tipo de vehículo/i), 'automovil');
    await usuario.selectOptions(screen.getByLabelText(/^cliente/i), '1');
    await usuario.click(within(dialogo()).getByRole('button', { name: 'Registrar' }));

    expect(await within(dialogo()).findByText('color debe tener entre 2 y 30 caracteres')).toBeInTheDocument();
  });

  it('muestra arriba del formulario los errores que no son de un campo (por ejemplo, sin conexión)', async () => {
    crearVehiculo.mockRejectedValue(new ErrorHttp('No pudimos comunicarnos con el servidor.', { estado: 0 }));
    const usuario = await abrirPagina();
    await usuario.click(screen.getByRole('button', { name: 'Nuevo vehículo' }));

    await usuario.type(screen.getByLabelText(/^placa/i), 'ABC999');
    await usuario.selectOptions(screen.getByLabelText(/tipo de vehículo/i), 'automovil');
    await usuario.selectOptions(screen.getByLabelText(/^cliente/i), '1');
    await usuario.click(within(dialogo()).getByRole('button', { name: 'Registrar' }));

    expect(await within(dialogo()).findByRole('alert')).toHaveTextContent('No pudimos comunicarnos con el servidor.');
  });

  it('cancelar cierra el formulario sin guardar', async () => {
    const usuario = await abrirPagina();
    await usuario.click(screen.getByRole('button', { name: 'Nuevo vehículo' }));

    await usuario.click(within(dialogo()).getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(crearVehiculo).not.toHaveBeenCalled();
  });
});

describe('VehiculosPage: editar', () => {
  it('abre el formulario con los datos del vehículo y guarda los cambios', async () => {
    const actualizado = { ...MAZDA, color: 'Azul' };
    actualizarVehiculo.mockResolvedValue(actualizado);
    const usuario = await abrirPagina();

    await usuario.click(screen.getByRole('button', { name: 'Editar vehículo ABC 123' }));

    expect(within(dialogo()).getByRole('heading', { name: 'Editar vehículo ABC 123' })).toBeInTheDocument();
    expect(screen.getByLabelText(/^placa/i)).toHaveValue('ABC123');
    expect(screen.getByLabelText(/tipo de vehículo/i)).toHaveValue('automovil');
    expect(screen.getByLabelText(/^marca/i)).toHaveValue('Mazda');
    expect(screen.getByLabelText(/^cliente/i)).toHaveValue('1');

    await usuario.clear(screen.getByLabelText(/^color/i));
    await usuario.type(screen.getByLabelText(/^color/i), 'Azul');
    await usuario.click(within(dialogo()).getByRole('button', { name: 'Guardar cambios' }));

    expect(actualizarVehiculo).toHaveBeenCalledWith(1, {
      placa: 'ABC123',
      tipoVehiculo: 'automovil',
      clienteId: 1,
      marca: 'Mazda',
      color: 'Azul',
    });
    expect(await within(filaDe('ABC 123')).findByText('Azul')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Vehículo ABC 123 actualizado correctamente.');
  });
});

describe('VehiculosPage: eliminar', () => {
  it('pide confirmación y elimina el vehículo de la tabla', async () => {
    eliminarVehiculo.mockResolvedValue(undefined);
    const usuario = await abrirPagina();

    await usuario.click(screen.getByRole('button', { name: 'Eliminar vehículo XYZ 98K' }));

    expect(within(dialogo()).getByText(/seguro que quieres eliminar/i)).toBeInTheDocument();
    expect(eliminarVehiculo).not.toHaveBeenCalled();

    await usuario.click(within(dialogo()).getByRole('button', { name: 'Eliminar' }));

    expect(eliminarVehiculo).toHaveBeenCalledWith(2);
    expect(screen.queryByText('XYZ 98K')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Vehículo XYZ 98K eliminado.');
  });

  it('cancelar no elimina nada', async () => {
    const usuario = await abrirPagina();
    await usuario.click(screen.getByRole('button', { name: 'Eliminar vehículo ABC 123' }));

    await usuario.click(within(dialogo()).getByRole('button', { name: 'Cancelar' }));

    expect(eliminarVehiculo).not.toHaveBeenCalled();
    expect(screen.getByText('ABC 123')).toBeInTheDocument();
  });

  it('si la API responde 409 (tiene órdenes) muestra el motivo y conserva el vehículo', async () => {
    eliminarVehiculo.mockRejectedValue(
      new ErrorHttp('No se puede eliminar un vehículo con órdenes de lavado asociadas', { estado: 409 }),
    );
    const usuario = await abrirPagina();
    await usuario.click(screen.getByRole('button', { name: 'Eliminar vehículo ABC 123' }));

    await usuario.click(within(dialogo()).getByRole('button', { name: 'Eliminar' }));

    expect(await within(dialogo()).findByRole('alert')).toHaveTextContent(
      'No se puede eliminar un vehículo con órdenes de lavado asociadas',
    );
    // La placa también aparece en el texto de la confirmación: se busca en la tabla.
    expect(within(screen.getByRole('table')).getByText('ABC 123')).toBeInTheDocument();
    expect(within(dialogo()).getByRole('button', { name: 'Eliminar' })).toBeEnabled();
  });
});

describe('VehiculosPage: historial', () => {
  it('muestra los lavados del vehículo, del más reciente al más antiguo, con servicio, estado y valor', async () => {
    listarOrdenesDeVehiculo.mockResolvedValue([
      { id: 1, fecha: '2026-08-01', turno: 2, servicioId: 10, valor: 28000, estado: 'entregada' },
      { id: 2, fecha: '2026-09-15', turno: 1, servicioId: 10, valor: 30000, estado: 'en_proceso' },
    ]);
    const usuario = await abrirPagina();

    await usuario.click(screen.getByRole('button', { name: 'Ver historial del vehículo ABC 123' }));

    const ventana = dialogo();
    expect(await within(ventana).findByText('15/09/2026')).toBeInTheDocument();
    expect(listarOrdenesDeVehiculo).toHaveBeenCalledWith(1, expect.anything());
    const filas = within(ventana).getAllByRole('row').slice(1);
    expect(filas[0]).toHaveTextContent('15/09/2026');
    expect(filas[0]).toHaveTextContent('Lavado general');
    expect(filas[0]).toHaveTextContent('En proceso');
    expect(filas[0]).toHaveTextContent('$ 30.000');
    expect(filas[1]).toHaveTextContent('01/08/2026');
    expect(filas[1]).toHaveTextContent('Entregada');
  });

  it('avisa cuando el vehículo todavía no tiene lavados', async () => {
    const usuario = await abrirPagina();

    await usuario.click(screen.getByRole('button', { name: 'Ver historial del vehículo ABC 123' }));

    expect(
      await within(dialogo()).findByText('Este vehículo todavía no tiene lavados registrados.'),
    ).toBeInTheDocument();
  });

  it('muestra el error y permite reintentar la carga del historial', async () => {
    listarOrdenesDeVehiculo.mockRejectedValueOnce(new ErrorHttp('El servidor presentó un error.', { estado: 500 }));
    const usuario = await abrirPagina();
    await usuario.click(screen.getByRole('button', { name: 'Ver historial del vehículo ABC 123' }));

    expect(await within(dialogo()).findByRole('alert')).toHaveTextContent('El servidor presentó un error.');

    await usuario.click(within(dialogo()).getByRole('button', { name: 'Reintentar' }));

    expect(
      await within(dialogo()).findByText('Este vehículo todavía no tiene lavados registrados.'),
    ).toBeInTheDocument();
  });

  it('si el servicio no se encuentra, muestra su número en lugar de dejar la celda vacía', async () => {
    listarOrdenesDeVehiculo.mockResolvedValue([
      { id: 1, fecha: '2026-08-01', turno: 1, servicioId: 99, valor: 12000, estado: 'terminada' },
    ]);
    const usuario = await abrirPagina();

    await usuario.click(screen.getByRole('button', { name: 'Ver historial del vehículo ABC 123' }));

    expect(await within(dialogo()).findByText('Servicio 99')).toBeInTheDocument();
  });
});

describe('VehiculosPage: marca y color ya registrados', () => {
  it('no deja guardar si se borra la marca o el color que el vehículo tenía', async () => {
    const usuario = await abrirPagina();

    await usuario.click(screen.getByRole('button', { name: 'Editar vehículo ABC 123' }));
    expect(screen.getByLabelText(/^marca/i)).toHaveAccessibleDescription(
      'Puedes cambiarla, pero no dejarla vacía.',
    );
    await usuario.clear(screen.getByLabelText(/^marca/i));
    await usuario.clear(screen.getByLabelText(/^color/i));
    await usuario.click(within(dialogo()).getByRole('button', { name: 'Guardar cambios' }));

    expect(actualizarVehiculo).not.toHaveBeenCalled();
    expect(within(dialogo()).getByText('La marca no se puede borrar. Escribe la correcta.')).toBeInTheDocument();
    expect(within(dialogo()).getByText('El color no se puede borrar. Escribe el correcto.')).toBeInTheDocument();
  });

  it('un vehículo sin marca ni color se edita sin enviarlos y sin la pista de "no dejarla vacía"', async () => {
    actualizarVehiculo.mockResolvedValue({ ...MOTO, clienteId: 1 });
    const usuario = await abrirPagina();

    await usuario.click(screen.getByRole('button', { name: 'Editar vehículo XYZ 98K' }));
    expect(screen.getByLabelText(/^marca/i)).not.toHaveAccessibleDescription();
    await usuario.selectOptions(screen.getByLabelText(/^cliente/i), '1');
    await usuario.click(within(dialogo()).getByRole('button', { name: 'Guardar cambios' }));

    expect(actualizarVehiculo).toHaveBeenCalledWith(2, {
      placa: 'XYZ98K',
      tipoVehiculo: 'moto_hasta_150cc',
      clienteId: 1,
    });
  });
});

describe('VehiculosPage: acciones según el rol', () => {
  it('soporte consulta y ve el historial, pero no ve registrar, editar ni eliminar', async () => {
    await abrirPagina('soporte');

    expect(screen.queryByRole('button', { name: 'Nuevo vehículo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^editar vehículo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^eliminar vehículo/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver historial del vehículo ABC 123' })).toBeInTheDocument();
    expect(screen.getByText('Busca un vehículo por su placa y revisa su historial de lavados.')).toBeInTheDocument();
  });

  it('a soporte, la lista vacía no lo invita a registrar', async () => {
    listarVehiculos.mockResolvedValue([]);

    await abrirPagina('soporte');

    expect(screen.getByText('Todavía no hay vehículos registrados.')).toBeInTheDocument();
  });

  it('superadmin y administrador ven registrar, editar y eliminar', async () => {
    for (const rol of ['superadmin', 'administrador']) {
      const { unmount } = renderPagina(rol);
      await screen.findByRole('table');

      expect(screen.getByRole('button', { name: 'Nuevo vehículo' }), rol).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Editar vehículo ABC 123' }), rol).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Eliminar vehículo ABC 123' }), rol).toBeInTheDocument();
      unmount();
    }
  });
});
