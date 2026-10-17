const clientes = require('../../../src/data/clientes');
const vehiculos = require('../../../src/data/vehiculos');
const colaboradores = require('../../../src/data/colaboradores');
const servicios = require('../../../src/data/servicios');
const ordenesLavado = require('../../../src/data/ordenesLavado');
const jornadas = require('../../../src/data/jornadas');

const clientesService = require('../../../src/services/clientes.service');
const vehiculosService = require('../../../src/services/vehiculos.service');
const colaboradoresService = require('../../../src/services/colaboradores.service');
const serviciosService = require('../../../src/services/servicios.service');
const jornadasService = require('../../../src/services/jornadas.service');

const {
  listarOrdenes,
  obtenerOrdenPorId,
  obtenerOrdenOFallar,
  colaboradorTieneOrdenes,
  servicioTieneOrdenes,
  vehiculoTieneOrdenes,
  crearOrden,
  editarOrden,
  cambiarEstadoOrden,
  calcularTotales,
  obtenerTotalesDeJornada,
} = require('../../../src/services/ordenesLavado.service');
const { NoEncontrado, Conflicto, SolicitudInvalida } = require('../../../src/utils/errores');

let contadorDocumentoCliente;

beforeEach(() => {
  clientes.length = 0;
  vehiculos.length = 0;
  colaboradores.length = 0;
  servicios.length = 0;
  ordenesLavado.length = 0;
  jornadas.length = 0;
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
  turno: 1,
  vehiculoId: vehiculo.id,
  servicioId: servicio.id,
  colaboradorId: colaborador.id,
  medioPago: 'efectivo',
  ...overrides,
});

const abrirJornadaDePrueba = () => jornadasService.abrirJornada();

/**
 * Para los tests de listarOrdenes, que necesitan dos fechas distintas:
 * abrirJornada() real siempre usa "hoy", así que aquí se inserta una
 * jornada con una fecha arbitraria directo en los datos, cerrando antes
 * cualquier otra que estuviera abierta.
 */
const abrirJornadaConFecha = (fecha) => {
  const abierta = jornadas.find((jornada) => jornada.estado === 'abierta');
  if (abierta) {
    abierta.estado = 'cerrada';
  }
  const nuevaJornada = {
    id: jornadas.length > 0 ? Math.max(...jornadas.map((jornada) => jornada.id)) + 1 : 1,
    fecha,
    estado: 'abierta',
    abiertaEn: new Date().toISOString(),
    abiertaPor: null,
    cerradaEn: null,
    cerradaPor: null,
    reaperturas: [],
  };
  jornadas.push(nuevaJornada);
  return nuevaJornada;
};

describe('ordenesLavado.service', () => {
  describe('crearOrden', () => {
    it('crea una orden con el valor calculado desde la tarifa del servicio (ignora datos.valor)', () => {
      abrirJornadaDePrueba();
      const escenario = construirEscenarioValido();
      const orden = crearOrden(datosOrdenValida(escenario, { valor: 999999999 }));

      expect(orden).toMatchObject({
        id: 1,
        vehiculoId: escenario.vehiculo.id,
        servicioId: escenario.servicio.id,
        colaboradorId: escenario.colaborador.id,
        valor: 15000,
        estado: 'registrada',
        motivo: null,
      });
      expect(orden.jornadaId).toBeDefined();
    });

    it('rechaza crear una orden si no hay ninguna jornada abierta (409)', () => {
      const escenario = construirEscenarioValido();
      expect(() => crearOrden(datosOrdenValida(escenario))).toThrow(Conflicto);
    });

    it('R1: rechaza un vehiculoId que no existe (404)', () => {
      abrirJornadaDePrueba();
      const escenario = construirEscenarioValido();
      expect(() => crearOrden(datosOrdenValida(escenario, { vehiculoId: 9999 }))).toThrow(
        NoEncontrado,
      );
    });

    it('R1: rechaza un servicioId que no existe (404)', () => {
      abrirJornadaDePrueba();
      const escenario = construirEscenarioValido();
      expect(() => crearOrden(datosOrdenValida(escenario, { servicioId: 9999 }))).toThrow(
        NoEncontrado,
      );
    });

    it('R1: rechaza un colaboradorId que no existe (404)', () => {
      abrirJornadaDePrueba();
      const escenario = construirEscenarioValido();
      expect(() => crearOrden(datosOrdenValida(escenario, { colaboradorId: 9999 }))).toThrow(
        NoEncontrado,
      );
    });

    it('R2: rechaza un colaborador inactivo (409)', () => {
      abrirJornadaDePrueba();
      const escenario = construirEscenarioValido();
      colaboradoresService.cambiarEstadoColaborador(escenario.colaborador.id, 'inactivo');

      expect(() => crearOrden(datosOrdenValida(escenario))).toThrow(Conflicto);
    });

    it('R3: rechaza un servicio inactivo (409)', () => {
      abrirJornadaDePrueba();
      const escenario = construirEscenarioValido();
      serviciosService.actualizarServicio(escenario.servicio.id, { activo: false });

      expect(() => crearOrden(datosOrdenValida(escenario))).toThrow(Conflicto);
    });

    it('R3: rechaza un servicio sin tarifa para el tipo de vehículo (409)', () => {
      abrirJornadaDePrueba();
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
      abrirJornadaDePrueba();
      const escenario = construirEscenarioValido();
      serviciosService.actualizarServicio(escenario.servicio.id, { numero: 5 });

      expect(() => crearOrden(datosOrdenValida(escenario))).toThrow(Conflicto);
    });

    it('R7: permite un servicio con lavado de motor cuando autorizaMotor es true', () => {
      abrirJornadaDePrueba();
      const escenario = construirEscenarioValido();
      serviciosService.actualizarServicio(escenario.servicio.id, { numero: 5 });

      const orden = crearOrden(datosOrdenValida(escenario, { autorizaMotor: true }));
      expect(orden.autorizaMotor).toBe(true);
    });

    it('R8: rechaza medioPago credito sin clienteId (409)', () => {
      abrirJornadaDePrueba();
      const escenario = construirEscenarioValido();
      expect(() => crearOrden(datosOrdenValida(escenario, { medioPago: 'credito' }))).toThrow(
        Conflicto,
      );
    });

    it('R8: rechaza medioPago credito con un clienteId que no existe (404)', () => {
      abrirJornadaDePrueba();
      const escenario = construirEscenarioValido();
      expect(() =>
        crearOrden(datosOrdenValida(escenario, { medioPago: 'credito', clienteId: 9999 })),
      ).toThrow(NoEncontrado);
    });

    it('R8: rechaza medioPago credito si el cliente no tiene crédito habilitado (409)', () => {
      abrirJornadaDePrueba();
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
      abrirJornadaDePrueba();
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
      abrirJornadaDePrueba();
      const escenario = construirEscenarioValido();
      const clienteCredito = crearClienteDePrueba({ documento: '900888888' });

      const orden = crearOrden(
        datosOrdenValida(escenario, { medioPago: 'credito', clienteId: clienteCredito.id }),
      );
      expect(orden.clienteId).toBe(clienteCredito.id);
    });

    it('ignora clienteId si medioPago no es credito (queda en null)', () => {
      abrirJornadaDePrueba();
      const escenario = construirEscenarioValido();
      const otroCliente = crearClienteDePrueba({ documento: '900777777' });

      const orden = crearOrden(
        datosOrdenValida(escenario, { medioPago: 'efectivo', clienteId: otroCliente.id }),
      );
      expect(orden.clienteId).toBeNull();
    });

    it('R5: rechaza un turno ya ocupado en la misma jornada (409)', () => {
      abrirJornadaDePrueba();
      const escenario = construirEscenarioValido();
      crearOrden(datosOrdenValida(escenario, { turno: 1 }));

      const otroVehiculo = crearVehiculoDePrueba({ placa: 'XYZ789' });
      expect(() =>
        crearOrden(datosOrdenValida({ ...escenario, vehiculo: otroVehiculo }, { turno: 1 })),
      ).toThrow(Conflicto);
    });

    it('dos turnos distintos en la misma jornada no chocan entre sí', () => {
      abrirJornadaDePrueba();
      const escenario = construirEscenarioValido();
      crearOrden(datosOrdenValida(escenario, { turno: 1 }));

      const otroVehiculo = crearVehiculoDePrueba({ placa: 'XYZ789' });
      expect(() =>
        crearOrden(datosOrdenValida({ ...escenario, vehiculo: otroVehiculo }, { turno: 2 })),
      ).not.toThrow();
    });

    it('R6: rechaza una segunda orden abierta para el mismo vehículo (409)', () => {
      abrirJornadaDePrueba();
      const escenario = construirEscenarioValido();
      crearOrden(datosOrdenValida(escenario, { turno: 1 }));

      expect(() => crearOrden(datosOrdenValida(escenario, { turno: 2 }))).toThrow(Conflicto);
    });

    it('permite una nueva orden para el mismo vehículo tras cerrar la anterior', () => {
      abrirJornadaDePrueba();
      const escenario = construirEscenarioValido();
      const primera = crearOrden(datosOrdenValida(escenario, { turno: 1 }));
      cambiarEstadoOrden(primera.id, 'cancelada', 'Cliente canceló');

      expect(() => crearOrden(datosOrdenValida(escenario, { turno: 2 }))).not.toThrow();
    });
  });

  describe('editarOrden', () => {
    it('edita vehiculoId y recalcula el valor según la tarifa del nuevo vehículo', () => {
      abrirJornadaDePrueba();
      const escenario = construirEscenarioValido();
      serviciosService.actualizarServicio(escenario.servicio.id, {
        tarifas: [
          { tipoVehiculo: 'automovil', valor: 15000 },
          { tipoVehiculo: 'camioneta', valor: 20000 },
        ],
      });
      const orden = crearOrden(datosOrdenValida(escenario));

      const nuevoVehiculo = crearVehiculoDePrueba({ placa: 'XYZ789', tipo: 'camioneta' });
      const editada = editarOrden(orden.id, { vehiculoId: nuevoVehiculo.id });

      expect(editada.vehiculoId).toBe(nuevoVehiculo.id);
      expect(editada.valor).toBe(20000);
    });

    it('rechaza editar a un colaborador inactivo (409)', () => {
      abrirJornadaDePrueba();
      const escenario = construirEscenarioValido();
      const orden = crearOrden(datosOrdenValida(escenario));

      const otroColaborador = crearColaboradorDePrueba({
        codigo: 402,
        documento: '1020304099',
      });
      colaboradoresService.cambiarEstadoColaborador(otroColaborador.id, 'inactivo');

      expect(() => editarOrden(orden.id, { colaboradorId: otroColaborador.id })).toThrow(Conflicto);
    });

    it('rechaza editar vehiculoId a uno que ya tiene otra orden abierta (409)', () => {
      abrirJornadaDePrueba();
      const escenario = construirEscenarioValido();
      const orden = crearOrden(datosOrdenValida(escenario, { turno: 1 }));

      const otroVehiculo = crearVehiculoDePrueba({ placa: 'XYZ789' });
      crearOrden(datosOrdenValida({ ...escenario, vehiculo: otroVehiculo }, { turno: 2 }));

      expect(() => editarOrden(orden.id, { vehiculoId: otroVehiculo.id })).toThrow(Conflicto);
    });

    it('rechaza editar una orden ya entregada (409)', () => {
      abrirJornadaDePrueba();
      const escenario = construirEscenarioValido();
      const orden = crearOrden(datosOrdenValida(escenario));
      cambiarEstadoOrden(orden.id, 'en_proceso');
      cambiarEstadoOrden(orden.id, 'terminada');
      cambiarEstadoOrden(orden.id, 'entregada');

      expect(() => editarOrden(orden.id, { observaciones: 'tarde' })).toThrow(Conflicto);
    });

    it('rechaza editar una orden ya cancelada (409)', () => {
      abrirJornadaDePrueba();
      const escenario = construirEscenarioValido();
      const orden = crearOrden(datosOrdenValida(escenario));
      cambiarEstadoOrden(orden.id, 'cancelada', 'Cliente canceló');

      expect(() => editarOrden(orden.id, { observaciones: 'tarde' })).toThrow(Conflicto);
    });

    it('rechaza editar una orden cuya jornada ya no está abierta (409)', () => {
      const jornada = abrirJornadaDePrueba();
      const escenario = construirEscenarioValido();
      const orden = crearOrden(datosOrdenValida(escenario));
      jornadasService.cerrarJornada(jornada.id);

      expect(() => editarOrden(orden.id, { observaciones: 'tarde' })).toThrow(Conflicto);
    });

    it('rechaza editar medioPago a credito sin un cliente con crédito habilitado (409)', () => {
      abrirJornadaDePrueba();
      const escenario = construirEscenarioValido();
      const orden = crearOrden(datosOrdenValida(escenario));

      expect(() => editarOrden(orden.id, { medioPago: 'credito' })).toThrow(Conflicto);
    });

    it('ignora "valor" y "estado" si se envían: el service no los cambia', () => {
      abrirJornadaDePrueba();
      const escenario = construirEscenarioValido();
      const orden = crearOrden(datosOrdenValida(escenario));

      const editada = editarOrden(orden.id, {
        valor: 1,
        estado: 'entregada',
        observaciones: 'actualizado',
      });

      expect(editada.valor).toBe(15000);
      expect(editada.estado).toBe('registrada');
      expect(editada.observaciones).toBe('actualizado');
    });

    it('lanza NoEncontrado si el id no existe', () => {
      expect(() => editarOrden(999, { observaciones: 'x' })).toThrow(NoEncontrado);
    });
  });

  describe('listarOrdenes', () => {
    it('devuelve todas las órdenes si no hay filtro', () => {
      const escenario = construirEscenarioValido();
      abrirJornadaConFecha('2026-01-10');
      crearOrden(datosOrdenValida(escenario, { turno: 1 }));

      const otroVehiculo = crearVehiculoDePrueba({ placa: 'XYZ789' });
      abrirJornadaConFecha('2026-01-11');
      crearOrden(datosOrdenValida({ ...escenario, vehiculo: otroVehiculo }, { turno: 1 }));

      expect(listarOrdenes()).toHaveLength(2);
    });

    it('filtra por fecha exacta cuando se envía filtros.fecha', () => {
      const escenario = construirEscenarioValido();
      abrirJornadaConFecha('2026-01-10');
      crearOrden(datosOrdenValida(escenario, { turno: 1 }));

      const otroVehiculo = crearVehiculoDePrueba({ placa: 'XYZ789' });
      abrirJornadaConFecha('2026-01-11');
      crearOrden(datosOrdenValida({ ...escenario, vehiculo: otroVehiculo }, { turno: 1 }));

      const resultado = listarOrdenes({ fecha: '2026-01-10' });
      expect(resultado).toHaveLength(1);
      expect(resultado[0].fecha).toBe('2026-01-10');
    });

    it('filtra por colaboradorId', () => {
      abrirJornadaDePrueba();
      const escenario = construirEscenarioValido();
      crearOrden(datosOrdenValida(escenario, { turno: 1 }));

      const otroColaborador = crearColaboradorDePrueba({ codigo: 402, documento: '1020304099' });
      const otroVehiculo = crearVehiculoDePrueba({ placa: 'XYZ789' });
      crearOrden(
        datosOrdenValida(
          { ...escenario, vehiculo: otroVehiculo, colaborador: otroColaborador },
          { turno: 2 },
        ),
      );

      const resultado = listarOrdenes({ colaboradorId: escenario.colaborador.id });
      expect(resultado).toHaveLength(1);
      expect(resultado[0].colaboradorId).toBe(escenario.colaborador.id);
    });

    it('filtra por servicioId', () => {
      abrirJornadaDePrueba();
      const escenario = construirEscenarioValido();
      crearOrden(datosOrdenValida(escenario, { turno: 1 }));

      const otroServicio = crearServicioDePrueba({ numero: 2 });
      const otroVehiculo = crearVehiculoDePrueba({ placa: 'XYZ789' });
      crearOrden(
        datosOrdenValida(
          { ...escenario, vehiculo: otroVehiculo, servicio: otroServicio },
          { turno: 2 },
        ),
      );

      const resultado = listarOrdenes({ servicioId: escenario.servicio.id });
      expect(resultado).toHaveLength(1);
      expect(resultado[0].servicioId).toBe(escenario.servicio.id);
    });

    it('filtra por medioPago', () => {
      abrirJornadaDePrueba();
      const escenario = construirEscenarioValido();
      crearOrden(datosOrdenValida(escenario, { turno: 1, medioPago: 'efectivo' }));

      const otroVehiculo = crearVehiculoDePrueba({ placa: 'XYZ789' });
      crearOrden(
        datosOrdenValida(
          { ...escenario, vehiculo: otroVehiculo },
          { turno: 2, medioPago: 'nequi' },
        ),
      );

      const resultado = listarOrdenes({ medioPago: 'nequi' });
      expect(resultado).toHaveLength(1);
      expect(resultado[0].medioPago).toBe('nequi');
    });

    it('filtra por jornadaId', () => {
      const escenario = construirEscenarioValido();
      const jornada1 = abrirJornadaConFecha('2026-01-10');
      crearOrden(datosOrdenValida(escenario, { turno: 1 }));

      const otroVehiculo = crearVehiculoDePrueba({ placa: 'XYZ789' });
      const jornada2 = abrirJornadaConFecha('2026-01-11');
      crearOrden(datosOrdenValida({ ...escenario, vehiculo: otroVehiculo }, { turno: 1 }));

      const resultado = listarOrdenes({ jornadaId: jornada1.id });
      expect(resultado).toHaveLength(1);
      expect(resultado[0].jornadaId).toBe(jornada1.id);
      expect(resultado[0].jornadaId).not.toBe(jornada2.id);
    });

    it('combina varios filtros a la vez con AND', () => {
      abrirJornadaDePrueba();
      const escenario = construirEscenarioValido();
      const primera = crearOrden(datosOrdenValida(escenario, { turno: 1, medioPago: 'efectivo' }));

      const otroVehiculo = crearVehiculoDePrueba({ placa: 'XYZ789' });
      crearOrden(
        datosOrdenValida(
          { ...escenario, vehiculo: otroVehiculo },
          { turno: 2, medioPago: 'nequi' },
        ),
      );

      const resultado = listarOrdenes({
        colaboradorId: escenario.colaborador.id,
        servicioId: escenario.servicio.id,
        medioPago: 'efectivo',
      });
      expect(resultado).toHaveLength(1);
      expect(resultado[0].id).toBe(primera.id);
    });
  });

  describe('calcularTotales', () => {
    it('con un arreglo vacío, todo queda en 0', () => {
      const totales = calcularTotales([]);
      expect(totales.cantidadServicios).toBe(0);
      expect(totales.totalGeneral).toBe(0);
      Object.values(totales.totalesPorMedioPago).forEach((valor) => expect(valor).toBe(0));
    });

    it('inicializa una clave en 0 por cada medio de pago del dominio, sin hardcodear nombres', () => {
      const totales = calcularTotales([]);
      expect(Object.keys(totales.totalesPorMedioPago).sort()).toEqual(
        ['efectivo', 'nequi', 'daviplata', 'bancolombia', 'datafono', 'credito'].sort(),
      );
    });

    it('suma cantidadServicios, totalGeneral y el desglose por medio de pago', () => {
      const ordenes = [
        { estado: 'registrada', valor: 15000, medioPago: 'efectivo' },
        { estado: 'entregada', valor: 20000, medioPago: 'nequi' },
        { estado: 'en_proceso', valor: 10000, medioPago: 'efectivo' },
      ];

      const totales = calcularTotales(ordenes);

      expect(totales.cantidadServicios).toBe(3);
      expect(totales.totalGeneral).toBe(45000);
      expect(totales.totalesPorMedioPago.efectivo).toBe(25000);
      expect(totales.totalesPorMedioPago.nequi).toBe(20000);
      expect(totales.totalesPorMedioPago.daviplata).toBe(0);
    });

    it('una orden cancelada no suma a cantidadServicios, totalGeneral ni a su medioPago', () => {
      const ordenes = [
        { estado: 'registrada', valor: 15000, medioPago: 'efectivo' },
        { estado: 'cancelada', valor: 999999, medioPago: 'efectivo' },
      ];

      const totales = calcularTotales(ordenes);

      expect(totales.cantidadServicios).toBe(1);
      expect(totales.totalGeneral).toBe(15000);
      expect(totales.totalesPorMedioPago.efectivo).toBe(15000);
    });
  });

  describe('obtenerTotalesDeJornada', () => {
    it('agrega unidades y ventaTotal solo de las órdenes de esa jornada, sin mezclar otra', () => {
      const escenario = construirEscenarioValido();
      const jornada1 = abrirJornadaConFecha('2026-01-10');
      crearOrden(datosOrdenValida(escenario, { turno: 1 }));

      const vehiculoB = crearVehiculoDePrueba({ placa: 'XYZ789' });
      const vehiculoC = crearVehiculoDePrueba({ placa: 'DEF456' });
      const jornada2 = abrirJornadaConFecha('2026-01-11');
      crearOrden(datosOrdenValida({ ...escenario, vehiculo: vehiculoB }, { turno: 1 }));
      crearOrden(datosOrdenValida({ ...escenario, vehiculo: vehiculoC }, { turno: 2 }));

      const totalesJornada2 = obtenerTotalesDeJornada(jornada2.id);
      expect(totalesJornada2.unidades).toBe(2);
      expect(totalesJornada2.ventaTotal).toBe(30000);

      const totalesJornada1 = obtenerTotalesDeJornada(jornada1.id);
      expect(totalesJornada1.unidades).toBe(1);
      expect(totalesJornada1.ventaTotal).toBe(15000);
    });

    it('devuelve unidades 0 y ventaTotal 0 para una jornada sin ninguna orden', () => {
      const jornadaVacia = abrirJornadaConFecha('2026-02-01');
      const totales = obtenerTotalesDeJornada(jornadaVacia.id);
      expect(totales).toEqual({ unidades: 0, ventaTotal: 0 });
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
      abrirJornadaDePrueba();
      const escenario = construirEscenarioValido();
      const orden = crearOrden(datosOrdenValida(escenario));
      cambiarEstadoOrden(orden.id, 'cancelada', 'Cliente canceló');

      expect(colaboradorTieneOrdenes(escenario.colaborador.id)).toBe(true);
    });

    it('servicioTieneOrdenes cuenta órdenes sin importar el estado, incluida cancelada', () => {
      abrirJornadaDePrueba();
      const escenario = construirEscenarioValido();
      const orden = crearOrden(datosOrdenValida(escenario));
      cambiarEstadoOrden(orden.id, 'cancelada', 'Cliente canceló');

      expect(servicioTieneOrdenes(escenario.servicio.id)).toBe(true);
    });

    it('vehiculoTieneOrdenes cuenta órdenes sin importar el estado, incluida cancelada', () => {
      abrirJornadaDePrueba();
      const escenario = construirEscenarioValido();
      const orden = crearOrden(datosOrdenValida(escenario));
      cambiarEstadoOrden(orden.id, 'cancelada', 'Cliente canceló');

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
      abrirJornadaDePrueba();
      const escenario = construirEscenarioValido();
      const orden = crearOrden(datosOrdenValida(escenario));

      // Avanza la orden hasta estadoInicial recorriendo transiciones válidas.
      const camino = {
        registrada: [],
        en_proceso: ['en_proceso'],
        terminada: ['en_proceso', 'terminada'],
      }[estadoInicial];
      camino.forEach((paso) => cambiarEstadoOrden(orden.id, paso));

      const motivo = estadoFinal === 'cancelada' ? 'Cliente canceló' : undefined;
      const actualizada = cambiarEstadoOrden(orden.id, estadoFinal, motivo);
      expect(actualizada.estado).toBe(estadoFinal);
    });

    it('rechaza saltar de registrada a entregada', () => {
      abrirJornadaDePrueba();
      const escenario = construirEscenarioValido();
      const orden = crearOrden(datosOrdenValida(escenario));
      expect(() => cambiarEstadoOrden(orden.id, 'entregada')).toThrow(Conflicto);
    });

    it('rechaza retroceder de entregada a en_proceso', () => {
      abrirJornadaDePrueba();
      const escenario = construirEscenarioValido();
      const orden = crearOrden(datosOrdenValida(escenario));
      cambiarEstadoOrden(orden.id, 'en_proceso');
      cambiarEstadoOrden(orden.id, 'terminada');
      cambiarEstadoOrden(orden.id, 'entregada');

      expect(() => cambiarEstadoOrden(orden.id, 'en_proceso')).toThrow(Conflicto);
    });

    it('una orden entregada nunca puede volver a cambiar de estado', () => {
      abrirJornadaDePrueba();
      const escenario = construirEscenarioValido();
      const orden = crearOrden(datosOrdenValida(escenario));
      cambiarEstadoOrden(orden.id, 'en_proceso');
      cambiarEstadoOrden(orden.id, 'terminada');
      cambiarEstadoOrden(orden.id, 'entregada');

      expect(() => cambiarEstadoOrden(orden.id, 'cancelada', 'motivo')).toThrow(Conflicto);
    });

    it('una orden cancelada nunca puede volver a cambiar de estado', () => {
      abrirJornadaDePrueba();
      const escenario = construirEscenarioValido();
      const orden = crearOrden(datosOrdenValida(escenario));
      cambiarEstadoOrden(orden.id, 'cancelada', 'Cliente canceló');

      expect(() => cambiarEstadoOrden(orden.id, 'en_proceso')).toThrow(Conflicto);
    });

    it('lanza NoEncontrado si el id no existe', () => {
      expect(() => cambiarEstadoOrden(999, 'en_proceso')).toThrow(NoEncontrado);
    });

    describe('cancelación con motivo', () => {
      it('rechaza cancelar sin motivo (400, SolicitudInvalida)', () => {
        abrirJornadaDePrueba();
        const escenario = construirEscenarioValido();
        const orden = crearOrden(datosOrdenValida(escenario));

        expect(() => cambiarEstadoOrden(orden.id, 'cancelada')).toThrow(SolicitudInvalida);
      });

      it('cancela con motivo y lo guarda en la orden', () => {
        abrirJornadaDePrueba();
        const escenario = construirEscenarioValido();
        const orden = crearOrden(datosOrdenValida(escenario));

        const cancelada = cambiarEstadoOrden(orden.id, 'cancelada', 'El cliente no llegó');

        expect(cancelada.estado).toBe('cancelada');
        expect(cancelada.motivo).toBe('El cliente no llegó');
      });

      it('cambiar a cualquier otro estado no exige ni guarda motivo', () => {
        abrirJornadaDePrueba();
        const escenario = construirEscenarioValido();
        const orden = crearOrden(datosOrdenValida(escenario));

        const actualizada = cambiarEstadoOrden(orden.id, 'en_proceso');

        expect(actualizada.estado).toBe('en_proceso');
        expect(actualizada.motivo).toBeNull();
      });
    });
  });
});
