const vehiculos = require('../../../src/data/vehiculos');
const clientesService = require('../../../src/services/clientes.service');
const {
  listarVehiculos,
  obtenerVehiculoPorId,
  obtenerVehiculoOFallar,
  clienteTieneVehiculos,
  crearVehiculo,
  actualizarVehiculo,
  eliminarVehiculo,
} = require('../../../src/services/vehiculos.service');
const { NoEncontrado, Conflicto, SolicitudInvalida } = require('../../../src/utils/errores');

const USUARIO_ID_PRUEBA = 1;

beforeEach(() => {
  vehiculos.length = 0;
});

// clientesService.crearCliente ya escribe en el Supabase local (SCRUM-152,
// Etapa A), no en un array que este beforeEach pudiera vaciar: el
// documento de cada cliente de prueba es único (salto aleatorio +
// contador) para no chocar entre pruebas ni entre corridas.
const selloDocumento = Math.floor(Math.random() * 1e6)
  .toString()
  .padStart(6, '0');
let contadorDocumento = 0;
const crearClienteDePrueba = () =>
  clientesService.crearCliente(
    {
      nombre: 'Ana María Torres',
      documento: `${selloDocumento}${String((contadorDocumento += 1)).padStart(3, '0')}`,
      tipo: 'particular',
      telefono: '3001234567',
    },
    USUARIO_ID_PRUEBA,
  );

const datosVehiculo = (clienteId) => ({
  placa: 'ABC123',
  tipoVehiculo: 'automovil',
  clienteId,
});

describe('vehiculos.service', () => {
  describe('crearVehiculo', () => {
    it('crea un vehículo con un id numérico', async () => {
      const cliente = await crearClienteDePrueba();
      const vehiculo = await crearVehiculo(datosVehiculo(cliente.id));
      expect(vehiculo).toMatchObject({ placa: 'ABC123', clienteId: cliente.id });
      expect(typeof vehiculo.id).toBe('number');
    });

    it('un vehículo sin marca ni color guarda null', async () => {
      const cliente = await crearClienteDePrueba();
      const vehiculo = await crearVehiculo(datosVehiculo(cliente.id));
      expect(vehiculo.marca).toBeNull();
      expect(vehiculo.color).toBeNull();
    });

    it('rechaza una placa duplicada (409)', async () => {
      const cliente = await crearClienteDePrueba();
      await crearVehiculo(datosVehiculo(cliente.id));
      await expect(crearVehiculo(datosVehiculo(cliente.id))).rejects.toThrow(Conflicto);
    });

    it('rechaza un clienteId que no existe (404)', async () => {
      await expect(crearVehiculo(datosVehiculo(999999999))).rejects.toThrow(NoEncontrado);
    });

    it('rechaza una placa de moto para un vehículo tipo automovil (400)', async () => {
      const cliente = await crearClienteDePrueba();
      await expect(
        crearVehiculo({ placa: 'ABC12D', tipoVehiculo: 'automovil', clienteId: cliente.id }),
      ).rejects.toThrow(SolicitudInvalida);
    });

    it('rechaza una placa de carro para un vehículo tipo moto (400)', async () => {
      const cliente = await crearClienteDePrueba();
      await expect(
        crearVehiculo({ placa: 'ABC123', tipoVehiculo: 'moto_hasta_150cc', clienteId: cliente.id }),
      ).rejects.toThrow(SolicitudInvalida);
    });
  });

  describe('listarVehiculos / obtenerVehiculoPorId', () => {
    it('lista todos los vehículos creados', async () => {
      const cliente = await crearClienteDePrueba();
      await crearVehiculo(datosVehiculo(cliente.id));
      await crearVehiculo({ ...datosVehiculo(cliente.id), placa: 'XYZ789' });
      expect(listarVehiculos()).toHaveLength(2);
    });

    it('devuelve null si el id no existe', () => {
      expect(obtenerVehiculoPorId(999)).toBeNull();
    });
  });

  describe('obtenerVehiculoOFallar', () => {
    it('lanza NoEncontrado si el id no existe', () => {
      expect(() => obtenerVehiculoOFallar(999)).toThrow(NoEncontrado);
    });
  });

  describe('clienteTieneVehiculos', () => {
    it('devuelve true si el cliente tiene al menos un vehículo', async () => {
      const cliente = await crearClienteDePrueba();
      await crearVehiculo(datosVehiculo(cliente.id));
      expect(clienteTieneVehiculos(cliente.id)).toBe(true);
    });

    it('devuelve false si el cliente no tiene vehículos', async () => {
      const cliente = await crearClienteDePrueba();
      expect(clienteTieneVehiculos(cliente.id)).toBe(false);
    });
  });

  describe('actualizarVehiculo', () => {
    it('actualiza el color', async () => {
      const cliente = await crearClienteDePrueba();
      const creado = await crearVehiculo(datosVehiculo(cliente.id));
      const actualizado = await actualizarVehiculo(creado.id, { color: 'rojo' });
      expect(actualizado.color).toBe('rojo');
    });

    it('rechaza reasignar a un clienteId que no existe', async () => {
      const cliente = await crearClienteDePrueba();
      const creado = await crearVehiculo(datosVehiculo(cliente.id));
      await expect(actualizarVehiculo(creado.id, { clienteId: 999999999 })).rejects.toThrow(
        NoEncontrado,
      );
    });

    it('rechaza cambiar a una placa que ya usa otro vehículo', async () => {
      const cliente = await crearClienteDePrueba();
      await crearVehiculo(datosVehiculo(cliente.id));
      const segundo = await crearVehiculo({ ...datosVehiculo(cliente.id), placa: 'XYZ789' });
      await expect(actualizarVehiculo(segundo.id, { placa: 'ABC123' })).rejects.toThrow(Conflicto);
    });
  });

  describe('eliminarVehiculo', () => {
    it('elimina un vehículo existente', async () => {
      const cliente = await crearClienteDePrueba();
      const creado = await crearVehiculo(datosVehiculo(cliente.id));
      eliminarVehiculo(creado.id);
      expect(obtenerVehiculoPorId(creado.id)).toBeNull();
    });

    it('lanza NoEncontrado si el id no existe', () => {
      expect(() => eliminarVehiculo(999)).toThrow(NoEncontrado);
    });
  });
});
