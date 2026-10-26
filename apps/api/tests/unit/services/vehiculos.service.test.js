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

// vehiculos.service.js y clientes.service.js ya escriben en el Supabase
// local (SCRUM-152), no en arrays que un beforeEach pudiera vaciar: el
// salto es aleatorio, no Date.now() — Jest corre archivos en paralelo en
// workers distintos y dos pueden arrancar en el mismo milisegundo.
const USUARIO_ID_PRUEBA = 1;
const sello = Math.floor(Math.random() * 1e6)
  .toString()
  .padStart(6, '0');
let contadorDocumento = 0;

const crearClienteDePrueba = () =>
  clientesService.crearCliente(
    {
      nombre: 'Ana María Torres',
      documento: `${sello}${String((contadorDocumento += 1)).padStart(3, '0')}`,
      tipo: 'particular',
      telefono: '3001234567',
    },
    USUARIO_ID_PRUEBA,
  );

// Prefijo de 3 letras aleatorio por archivo (no por contador: con solo 3
// dígitos de sufijo, un prefijo fijo como 'ABC' se agotaría rápido entre
// archivos que corren en paralelo) + contador para el sufijo, siempre con
// formato de carro.
const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const letraAleatoria = () => LETRAS[Math.floor(Math.random() * LETRAS.length)];
const prefijoPlaca = `${letraAleatoria()}${letraAleatoria()}${letraAleatoria()}`;
let contadorPlaca = 0;
const placaUnica = () => {
  contadorPlaca += 1;
  return `${prefijoPlaca}${String(contadorPlaca).padStart(3, '0')}`;
};

const datosVehiculo = (clienteId, overrides = {}) => ({
  placa: placaUnica(),
  tipoVehiculo: 'automovil',
  clienteId,
  ...overrides,
});

describe('vehiculos.service', () => {
  describe('crearVehiculo', () => {
    it('crea un vehículo con un id numérico', async () => {
      const cliente = await crearClienteDePrueba();
      const datos = datosVehiculo(cliente.id);
      const vehiculo = await crearVehiculo(datos);
      expect(vehiculo).toMatchObject({ placa: datos.placa, clienteId: cliente.id });
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
      const datos = datosVehiculo(cliente.id);
      await crearVehiculo(datos);
      await expect(crearVehiculo(datos)).rejects.toThrow(Conflicto);
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
    it('la lista incluye los vehículos recién creados', async () => {
      const cliente = await crearClienteDePrueba();
      const primero = await crearVehiculo(datosVehiculo(cliente.id));
      const segundo = await crearVehiculo(datosVehiculo(cliente.id));

      const ids = (await listarVehiculos()).map((vehiculo) => vehiculo.id);
      expect(ids).toEqual(expect.arrayContaining([primero.id, segundo.id]));
    });

    it('devuelve null si el id no existe', async () => {
      await expect(obtenerVehiculoPorId(999999999)).resolves.toBeNull();
    });
  });

  describe('obtenerVehiculoOFallar', () => {
    it('lanza NoEncontrado si el id no existe', async () => {
      await expect(obtenerVehiculoOFallar(999999999)).rejects.toThrow(NoEncontrado);
    });
  });

  describe('clienteTieneVehiculos', () => {
    it('devuelve true si el cliente tiene al menos un vehículo', async () => {
      const cliente = await crearClienteDePrueba();
      await crearVehiculo(datosVehiculo(cliente.id));
      await expect(clienteTieneVehiculos(cliente.id)).resolves.toBe(true);
    });

    it('devuelve false si el cliente no tiene vehículos', async () => {
      const cliente = await crearClienteDePrueba();
      await expect(clienteTieneVehiculos(cliente.id)).resolves.toBe(false);
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
      const primero = await crearVehiculo(datosVehiculo(cliente.id));
      const segundo = await crearVehiculo(datosVehiculo(cliente.id));
      await expect(actualizarVehiculo(segundo.id, { placa: primero.placa })).rejects.toThrow(
        Conflicto,
      );
    });
  });

  describe('eliminarVehiculo', () => {
    it('elimina un vehículo existente', async () => {
      const cliente = await crearClienteDePrueba();
      const creado = await crearVehiculo(datosVehiculo(cliente.id));
      await eliminarVehiculo(creado.id);
      await expect(obtenerVehiculoPorId(creado.id)).resolves.toBeNull();
    });

    it('lanza NoEncontrado si el id no existe', async () => {
      await expect(eliminarVehiculo(999999999)).rejects.toThrow(NoEncontrado);
    });
  });
});
