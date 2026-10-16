const clientes = require('../../../src/data/clientes');
const vehiculos = require('../../../src/data/vehiculos');
const colaboradores = require('../../../src/data/colaboradores');
const servicios = require('../../../src/data/servicios');
const ordenesLavado = require('../../../src/data/ordenesLavado');

const clientesService = require('../../../src/services/clientes.service');
const vehiculosService = require('../../../src/services/vehiculos.service');
const colaboradoresService = require('../../../src/services/colaboradores.service');
const serviciosService = require('../../../src/services/servicios.service');

const {
  listarOrdenes,
  obtenerOrdenPorId,
  obtenerOrdenOFallar,
  colaboradorTieneOrdenes,
  servicioTieneOrdenes,
  vehiculoTieneOrdenes,
  crearOrden,
  cambiarEstadoOrden,
} = require('../../../src/services/ordenesLavado.service');
const { NoEncontrado, Conflicto } = require('../../../src/utils/errores');

let contadorDocumentoCliente;

beforeEach(() => {
  clientes.length = 0;
  vehiculos.length = 0;
  colaboradores.length = 0;
  servicios.length = 0;
  ordenesLavado.length = 0;
  contadorDocumentoCliente = 0;
});

/** Documento único por llamada, para no chocar con el cliente por defecto de cada vehículo de prueba. */
const siguienteDocumentoCliente = () => {
  contadorDocumentoCliente += 1;
  return `9001234${String(contadorDocumentoCliente).padStart(2, '0')}`;
};

const crearClienteDePrueba = (datos = {}) =>
  clientesService.crearCliente({
    nombre: 'Constructora Ejemplo S.A.S.',
    documento: siguienteDocumentoCliente(),
    tipo: 'empresa',
    telefono: '3001234567',
    creditoHabilitado: true,
    ...datos,
  });

const crearVehiculoDePrueba = (datos = {}) => {
  const { clienteId, ...resto } = datos;
  const idCliente = clienteId ?? crearClienteDePrueba().id;
  return vehiculosService.crearVehiculo({
    placa: 'ABC123',
    tipo: 'automovil',
    clienteId: idCliente,
    ...resto,
  });
};

const crearColaboradorDePrueba = (datos = {}) =>
  colaboradoresService.crearColaborador({
    codigo: 401,
    nombre: 'Juan Pérez',
    documento: '1020304050',
    telefono: '3001234567',
    porcentajeComision: 0.15,
    tipoVinculacion: 'fijo',
    ...datos,
  });

const crearServicioDePrueba = (datos = {}) =>
  serviciosService.crearServicio({
    numero: 1,
    nombre: 'Lavado básico',
    descripcion: 'Lavado exterior con shampoo',
    categoria: 'basico',
    tarifas: [{ tipoVehiculo: 'automovil', valor: 15000 }],
    ...datos,
  });

/** Crea vehículo, colaborador y servicio compatibles entre sí (mismo tipo de vehículo que cubre la tarifa). */
const construirEscenarioValido = () => ({
  vehiculo: crearVehiculoDePrueba(),
  colaborador: crearColaboradorDePrueba(),
  servicio: crearServicioDePrueba(),
});

const datosOrdenValida = ({ vehiculo, colaborador, servicio }, overrides = {}) => ({
  fecha: '2026-01-10',
  turno: 1,
  vehiculoId: vehiculo.id,
  servicioId: servicio.id,
  colaboradorId: colaborador.id,
  medioPago: 'efectivo',
  ...overrides,
});

describe('ordenesLavado.service', () => {
  describe('crearOrden', () => {
    it('crea una orden con el valor calculado desde la tarifa del servicio (ignora datos.valor)', () => {
      const escenario = construirEscenarioValido();
      const orden = crearOrden(datosOrdenValida(escenario, { valor: 999999999 }));

      expect(orden).toMatchObject({
        id: 1,
        vehiculoId: escenario.vehiculo.id,
        servicioId: escenario.servicio.id,
        colaboradorId: escenario.colaborador.id,
        valor: 15000,
        estado: 'registrada',
      });
    });

    it('R1: rechaza un vehiculoId que no existe (404)', () => {
      const escenario = construirEscenarioValido();
      expect(() => crearOrden(datosOrdenValida(escenario, { vehiculoId: 9999 }))).toThrow(
        NoEncontrado,
      );
    });

    it('R1: rechaza un servicioId que no existe (404)', () => {
      const escenario = construirEscenarioValido();
      expect(() => crearOrden(datosOrdenValida(escenario, { servicioId: 9999 }))).toThrow(
        NoEncontrado,
      );
    });

    it('R1: rechaza un colaboradorId que no existe (404)', () => {
      const escenario = construirEscenarioValido();
      expect(() => crearOrden(datosOrdenValida(escenario, { colaboradorId: 9999 }))).toThrow(
        NoEncontrado,
      );
    });

    it('R2: rechaza un colaborador inactivo (409)', () => {
      const escenario = construirEscenarioValido();
      colaboradoresService.cambiarEstadoColaborador(escenario.colaborador.id, 'inactivo');

      expect(() => crearOrden(datosOrdenValida(escenario))).toThrow(Conflicto);
    });

    it('R3: rechaza un servicio inactivo (409)', () => {
      const escenario = construirEscenarioValido();
      serviciosService.actualizarServicio(escenario.servicio.id, { activo: false });

      expect(() => crearOrden(datosOrdenValida(escenario))).toThrow(Conflicto);
    });

    it('R3: rechaza un servicio sin tarifa para el tipo de vehículo (409)', () => {
      const vehiculo = crearVehiculoDePrueba({ tipo: 'automovil' });
      const colaborador = crearColaboradorDePrueba();
      const servicio = crearServicioDePrueba({
        tarifas: [{ tipoVehiculo: 'camioneta', valor: 20000 }],
      });

      expect(() => crearOrden(datosOrdenValida({ vehiculo, colaborador, servicio }))).toThrow(
        Conflicto,
      );
    });

    it('R7: rechaza un servicio con lavado de motor sin autorizaMotor (409)', () => {
      const escenario = construirEscenarioValido();
      serviciosService.actualizarServicio(escenario.servicio.id, { numero: 5 });

      expect(() => crearOrden(datosOrdenValida(escenario))).toThrow(Conflicto);
    });

    it('R7: permite un servicio con lavado de motor cuando autorizaMotor es true', () => {
      const escenario = construirEscenarioValido();
      serviciosService.actualizarServicio(escenario.servicio.id, { numero: 5 });

      const orden = crearOrden(datosOrdenValida(escenario, { autorizaMotor: true }));
      expect(orden.autorizaMotor).toBe(true);
    });

    it('R8: rechaza medioPago credito sin clienteId (409)', () => {
      const escenario = construirEscenarioValido();
      expect(() => crearOrden(datosOrdenValida(escenario, { medioPago: 'credito' }))).toThrow(
        Conflicto,
      );
    });

    it('R8: rechaza medioPago credito con un clienteId que no existe (404)', () => {
      const escenario = construirEscenarioValido();
      expect(() =>
        crearOrden(datosOrdenValida(escenario, { medioPago: 'credito', clienteId: 9999 })),
      ).toThrow(NoEncontrado);
    });

    it('R8: rechaza medioPago credito si el cliente no tiene crédito habilitado (409)', () => {
      const escenario = construirEscenarioValido();
      const clienteSinCredito = crearClienteDePrueba({
        documento: '900999999',
        creditoHabilitado: false,
      });

      expect(() =>
        crearOrden(
          datosOrdenValida(escenario, { medioPago: 'credito', clienteId: clienteSinCredito.id }),
        ),
      ).toThrow(Conflicto);
    });

    it('R8: rechaza medioPago credito si el cliente es particular (409)', () => {
      const escenario = construirEscenarioValido();
      const clienteParticular = clientesService.crearCliente({
        nombre: 'Ana María Torres',
        documento: '1010101010',
        tipo: 'particular',
        telefono: '3009999999',
      });

      expect(() =>
        crearOrden(
          datosOrdenValida(escenario, { medioPago: 'credito', clienteId: clienteParticular.id }),
        ),
      ).toThrow(Conflicto);
    });

    it('R8: acepta medioPago credito con un cliente empresa activo y con crédito habilitado', () => {
      const escenario = construirEscenarioValido();
      const clienteCredito = crearClienteDePrueba({ documento: '900888888' });

      const orden = crearOrden(
        datosOrdenValida(escenario, { medioPago: 'credito', clienteId: clienteCredito.id }),
      );
      expect(orden.clienteId).toBe(clienteCredito.id);
    });

    it('ignora clienteId si medioPago no es credito (queda en null)', () => {
      const escenario = construirEscenarioValido();
      const otroCliente = crearClienteDePrueba({ documento: '900777777' });

      const orden = crearOrden(
        datosOrdenValida(escenario, { medioPago: 'efectivo', clienteId: otroCliente.id }),
      );
      expect(orden.clienteId).toBeNull();
    });

    it('R5: rechaza un turno ya ocupado en la misma fecha (409)', () => {
      const escenario = construirEscenarioValido();
      crearOrden(datosOrdenValida(escenario));

      const otroVehiculo = crearVehiculoDePrueba({ placa: 'XYZ789' });
      expect(() =>
        crearOrden(
          datosOrdenValida(
            { ...escenario, vehiculo: otroVehiculo },
            { fecha: '2026-01-10', turno: 1 },
          ),
        ),
      ).toThrow(Conflicto);
    });

    it('dos turnos distintos en la misma fecha no chocan entre sí', () => {
      const escenario = construirEscenarioValido();
      crearOrden(datosOrdenValida(escenario, { turno: 1 }));

      const otroVehiculo = crearVehiculoDePrueba({ placa: 'XYZ789' });
      expect(() =>
        crearOrden(datosOrdenValida({ ...escenario, vehiculo: otroVehiculo }, { turno: 2 })),
      ).not.toThrow();
    });

    it('R6: rechaza una segunda orden abierta para el mismo vehículo (409)', () => {
      const escenario = construirEscenarioValido();
      crearOrden(datosOrdenValida(escenario, { turno: 1 }));

      expect(() => crearOrden(datosOrdenValida(escenario, { turno: 2 }))).toThrow(Conflicto);
    });

    it('permite una nueva orden para el mismo vehículo tras cerrar la anterior', () => {
      const escenario = construirEscenarioValido();
      const primera = crearOrden(datosOrdenValida(escenario, { turno: 1 }));
      cambiarEstadoOrden(primera.id, 'cancelada');

      expect(() => crearOrden(datosOrdenValida(escenario, { turno: 2 }))).not.toThrow();
    });
  });

  describe('listarOrdenes', () => {
    it('devuelve todas las órdenes si no hay filtro', () => {
      const escenario = construirEscenarioValido();
      const otroVehiculo = crearVehiculoDePrueba({ placa: 'XYZ789' });
      crearOrden(datosOrdenValida(escenario, { fecha: '2026-01-10', turno: 1 }));
      crearOrden(
        datosOrdenValida(
          { ...escenario, vehiculo: otroVehiculo },
          { fecha: '2026-01-11', turno: 1 },
        ),
      );
      expect(listarOrdenes()).toHaveLength(2);
    });

    it('filtra por fecha exacta cuando se envía filtros.fecha', () => {
      const escenario = construirEscenarioValido();
      const otroVehiculo = crearVehiculoDePrueba({ placa: 'XYZ789' });
      crearOrden(datosOrdenValida(escenario, { fecha: '2026-01-10', turno: 1 }));
      crearOrden(
        datosOrdenValida(
          { ...escenario, vehiculo: otroVehiculo },
          { fecha: '2026-01-11', turno: 1 },
        ),
      );

      const resultado = listarOrdenes({ fecha: '2026-01-10' });
      expect(resultado).toHaveLength(1);
      expect(resultado[0].fecha).toBe('2026-01-10');
    });
  });

  describe('obtenerOrdenPorId / obtenerOrdenOFallar', () => {
    it('devuelve null si el id no existe', () => {
      expect(obtenerOrdenPorId(999)).toBeNull();
    });

    it('lanza NoEncontrado si el id no existe', () => {
      expect(() => obtenerOrdenOFallar(999)).toThrow(NoEncontrado);
    });
  });

  describe('*TieneOrdenes', () => {
    it('colaboradorTieneOrdenes cuenta órdenes sin importar el estado, incluida cancelada', () => {
      const escenario = construirEscenarioValido();
      const orden = crearOrden(datosOrdenValida(escenario));
      cambiarEstadoOrden(orden.id, 'cancelada');

      expect(colaboradorTieneOrdenes(escenario.colaborador.id)).toBe(true);
    });

    it('servicioTieneOrdenes cuenta órdenes sin importar el estado, incluida cancelada', () => {
      const escenario = construirEscenarioValido();
      const orden = crearOrden(datosOrdenValida(escenario));
      cambiarEstadoOrden(orden.id, 'cancelada');

      expect(servicioTieneOrdenes(escenario.servicio.id)).toBe(true);
    });

    it('vehiculoTieneOrdenes cuenta órdenes sin importar el estado, incluida cancelada', () => {
      const escenario = construirEscenarioValido();
      const orden = crearOrden(datosOrdenValida(escenario));
      cambiarEstadoOrden(orden.id, 'cancelada');

      expect(vehiculoTieneOrdenes(escenario.vehiculo.id)).toBe(true);
    });

    it('devuelven false cuando no hay ninguna orden asociada', () => {
      const escenario = construirEscenarioValido();
      expect(colaboradorTieneOrdenes(escenario.colaborador.id)).toBe(false);
      expect(servicioTieneOrdenes(escenario.servicio.id)).toBe(false);
      expect(vehiculoTieneOrdenes(escenario.vehiculo.id)).toBe(false);
    });
  });

  describe('cambiarEstadoOrden', () => {
    it.each([
      ['registrada', 'en_proceso'],
      ['registrada', 'cancelada'],
      ['en_proceso', 'terminada'],
      ['en_proceso', 'cancelada'],
      ['terminada', 'entregada'],
    ])('permite la transición de %s a %s', (estadoInicial, estadoFinal) => {
      const escenario = construirEscenarioValido();
      const orden = crearOrden(datosOrdenValida(escenario));

      // Avanza la orden hasta estadoInicial recorriendo transiciones válidas.
      const camino = {
        registrada: [],
        en_proceso: ['en_proceso'],
        terminada: ['en_proceso', 'terminada'],
      }[estadoInicial];
      camino.forEach((paso) => cambiarEstadoOrden(orden.id, paso));

      const actualizada = cambiarEstadoOrden(orden.id, estadoFinal);
      expect(actualizada.estado).toBe(estadoFinal);
    });

    it('rechaza saltar de registrada a entregada', () => {
      const escenario = construirEscenarioValido();
      const orden = crearOrden(datosOrdenValida(escenario));
      expect(() => cambiarEstadoOrden(orden.id, 'entregada')).toThrow(Conflicto);
    });

    it('rechaza retroceder de entregada a en_proceso', () => {
      const escenario = construirEscenarioValido();
      const orden = crearOrden(datosOrdenValida(escenario));
      cambiarEstadoOrden(orden.id, 'en_proceso');
      cambiarEstadoOrden(orden.id, 'terminada');
      cambiarEstadoOrden(orden.id, 'entregada');

      expect(() => cambiarEstadoOrden(orden.id, 'en_proceso')).toThrow(Conflicto);
    });

    it('una orden entregada nunca puede volver a cambiar de estado', () => {
      const escenario = construirEscenarioValido();
      const orden = crearOrden(datosOrdenValida(escenario));
      cambiarEstadoOrden(orden.id, 'en_proceso');
      cambiarEstadoOrden(orden.id, 'terminada');
      cambiarEstadoOrden(orden.id, 'entregada');

      expect(() => cambiarEstadoOrden(orden.id, 'cancelada')).toThrow(Conflicto);
    });

    it('una orden cancelada nunca puede volver a cambiar de estado', () => {
      const escenario = construirEscenarioValido();
      const orden = crearOrden(datosOrdenValida(escenario));
      cambiarEstadoOrden(orden.id, 'cancelada');

      expect(() => cambiarEstadoOrden(orden.id, 'en_proceso')).toThrow(Conflicto);
    });

    it('lanza NoEncontrado si el id no existe', () => {
      expect(() => cambiarEstadoOrden(999, 'en_proceso')).toThrow(NoEncontrado);
    });
  });
});
