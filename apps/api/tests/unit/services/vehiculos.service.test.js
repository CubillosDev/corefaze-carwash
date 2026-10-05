const clientes = require('../../../src/data/clientes');
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

beforeEach(() => {
  clientes.length = 0;
  vehiculos.length = 0;
});

const crearClienteDePrueba = () =>
  clientesService.crearCliente({
    nombre: 'Ana María Torres',
    documento: '1010101010',
    tipo: 'particular',
    telefono: '3001234567',
  });

const datosVehiculo = (clienteId) => ({
  placa: 'ABC123',
  tipo: 'automovil',
  clienteId,
});

describe('vehiculos.service', () => {
  describe('crearVehiculo', () => {
    it('crea un vehículo con id 1', () => {
      const cliente = crearClienteDePrueba();
      const vehiculo = crearVehiculo(datosVehiculo(cliente.id));
      expect(vehiculo).toMatchObject({ id: 1, placa: 'ABC123', clienteId: cliente.id });
    });

    it('un vehículo sin marca ni color guarda null', () => {
      const cliente = crearClienteDePrueba();
      const vehiculo = crearVehiculo(datosVehiculo(cliente.id));
      expect(vehiculo.marca).toBeNull();
      expect(vehiculo.color).toBeNull();
    });

    it('rechaza una placa duplicada (409)', () => {
      const cliente = crearClienteDePrueba();
      crearVehiculo(datosVehiculo(cliente.id));
      expect(() => crearVehiculo(datosVehiculo(cliente.id))).toThrow(Conflicto);
    });

    it('rechaza un clienteId que no existe (404)', () => {
      expect(() => crearVehiculo(datosVehiculo(9999))).toThrow(NoEncontrado);
    });

    it('rechaza una placa de moto para un vehículo tipo automovil (400)', () => {
      const cliente = crearClienteDePrueba();
      expect(() =>
        crearVehiculo({ placa: 'ABC12D', tipo: 'automovil', clienteId: cliente.id }),
      ).toThrow(SolicitudInvalida);
    });

    it('rechaza una placa de carro para un vehículo tipo moto (400)', () => {
      const cliente = crearClienteDePrueba();
      expect(() =>
        crearVehiculo({ placa: 'ABC123', tipo: 'moto_hasta_150cc', clienteId: cliente.id }),
      ).toThrow(SolicitudInvalida);
    });
  });

  describe('listarVehiculos / obtenerVehiculoPorId', () => {
    it('lista todos los vehículos creados', () => {
      const cliente = crearClienteDePrueba();
      crearVehiculo(datosVehiculo(cliente.id));
      crearVehiculo({ ...datosVehiculo(cliente.id), placa: 'XYZ789' });
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
    it('devuelve true si el cliente tiene al menos un vehículo', () => {
      const cliente = crearClienteDePrueba();
      crearVehiculo(datosVehiculo(cliente.id));
      expect(clienteTieneVehiculos(cliente.id)).toBe(true);
    });

    it('devuelve false si el cliente no tiene vehículos', () => {
      const cliente = crearClienteDePrueba();
      expect(clienteTieneVehiculos(cliente.id)).toBe(false);
    });
  });

  describe('actualizarVehiculo', () => {
    it('actualiza el color', () => {
      const cliente = crearClienteDePrueba();
      const creado = crearVehiculo(datosVehiculo(cliente.id));
      const actualizado = actualizarVehiculo(creado.id, { color: 'rojo' });
      expect(actualizado.color).toBe('rojo');
    });

    it('rechaza reasignar a un clienteId que no existe', () => {
      const cliente = crearClienteDePrueba();
      const creado = crearVehiculo(datosVehiculo(cliente.id));
      expect(() => actualizarVehiculo(creado.id, { clienteId: 9999 })).toThrow(NoEncontrado);
    });

    it('rechaza cambiar a una placa que ya usa otro vehículo', () => {
      const cliente = crearClienteDePrueba();
      crearVehiculo(datosVehiculo(cliente.id));
      const segundo = crearVehiculo({ ...datosVehiculo(cliente.id), placa: 'XYZ789' });
      expect(() => actualizarVehiculo(segundo.id, { placa: 'ABC123' })).toThrow(Conflicto);
    });
  });

  describe('eliminarVehiculo', () => {
    it('elimina un vehículo existente', () => {
      const cliente = crearClienteDePrueba();
      const creado = crearVehiculo(datosVehiculo(cliente.id));
      eliminarVehiculo(creado.id);
      expect(obtenerVehiculoPorId(creado.id)).toBeNull();
    });

    it('lanza NoEncontrado si el id no existe', () => {
      expect(() => eliminarVehiculo(999)).toThrow(NoEncontrado);
    });
  });
});
