const vehiculos = require('../data/vehiculos');
const clientesService = require('./clientes.service');
const { TIPOS_VEHICULO_MOTO, PATRONES_PLACA } = require('../constants/dominio');
const { Conflicto, NoEncontrado, SolicitudInvalida } = require('../utils/errores');

/**
 * Busca un vehículo por placa (ya normalizada a mayúsculas por el validador).
 * @param {string} placa
 * @returns {object | undefined}
 */
const buscarPorPlaca = (placa) => vehiculos.find((vehiculo) => vehiculo.placa === placa);

/**
 * Lista todos los vehículos.
 * @returns {object[]}
 */
const listarVehiculos = () => vehiculos;

/**
 * Obtiene un vehículo por id.
 * @param {number|string} id
 * @returns {object | null}
 */
const obtenerVehiculoPorId = (id) => {
  const vehiculo = vehiculos.find((candidato) => candidato.id === Number(id));
  return vehiculo ?? null;
};

/**
 * Obtiene un vehículo por id, o lanza NoEncontrado (404).
 * @param {number|string} id
 * @returns {object}
 * @throws {NoEncontrado}
 */
const obtenerVehiculoOFallar = (id) => {
  const vehiculo = obtenerVehiculoPorId(id);
  if (!vehiculo) {
    throw new NoEncontrado('Vehículo no encontrado');
  }
  return vehiculo;
};

/**
 * Integridad referencial (patrón <entidad>Tiene<Relacion>() del estándar):
 * vive aquí porque Vehículos es quien tiene la llave foránea clienteId.
 * clientes.controller.js llama a esta función antes de eliminar un cliente.
 *
 * @param {number|string} clienteId
 * @returns {boolean}
 */
const clienteTieneVehiculos = (clienteId) =>
  vehiculos.some((vehiculo) => vehiculo.clienteId === Number(clienteId));

const esTipoMoto = (tipo) => TIPOS_VEHICULO_MOTO.includes(tipo);

/**
 * La placa debe corresponder exactamente al tipo de vehículo (no una placa
 * de moto en un automóvil, ni viceversa). El validador solo confirma que
 * la placa tenga ALGUNO de los dos formatos; esta correspondencia exacta
 * vive aquí porque en una actualización el tipo puede no venir en la
 * petición, y hace falta el vehículo ya guardado para resolverlo.
 *
 * @param {string} placa
 * @param {string} tipo
 * @throws {SolicitudInvalida} si no corresponden
 */
const validarPlacaCorrespondeATipo = (placa, tipo) => {
  const patronEsperado = esTipoMoto(tipo) ? PATRONES_PLACA.MOTO : PATRONES_PLACA.CARRO;

  if (!patronEsperado.test(placa)) {
    throw new SolicitudInvalida([
      {
        campo: 'placa',
        mensaje: `La placa no corresponde al formato de ${esTipoMoto(tipo) ? 'moto' : 'carro'}`,
      },
    ]);
  }
};

/**
 * Crea un vehículo nuevo.
 *
 * Reglas de negocio:
 * - La placa debe ser única (409 si ya existe).
 * - La placa debe corresponder al tipo de vehículo (400 si no).
 * - clienteId debe existir (404 si no) — se delega a clientesService.
 *
 * @param {{ placa: string, tipo: string, marca?: string, color?: string, clienteId: number }} datos
 * @returns {object} el vehículo creado
 */
const crearVehiculo = (datos) => {
  if (buscarPorPlaca(datos.placa)) {
    throw new Conflicto('Ya existe un vehículo con esa placa');
  }

  validarPlacaCorrespondeATipo(datos.placa, datos.tipo);

  // Lanza NoEncontrado (404) si el cliente no existe; no seguimos si falla.
  clientesService.obtenerClienteOFallar(datos.clienteId);

  const nuevoVehiculo = {
    id: vehiculos.length > 0 ? Math.max(...vehiculos.map((vehiculo) => vehiculo.id)) + 1 : 1,
    placa: datos.placa,
    tipo: datos.tipo,
    marca: datos.marca ?? null,
    color: datos.color ?? null,
    clienteId: Number(datos.clienteId),
  };

  vehiculos.push(nuevoVehiculo);
  return nuevoVehiculo;
};

/**
 * Actualiza un vehículo existente.
 *
 * @param {number|string} id
 * @param {{ placa?: string, tipo?: string, marca?: string, color?: string, clienteId?: number }} datos
 * @returns {object} el vehículo actualizado
 * @throws {NoEncontrado} si el vehículo o el nuevo clienteId no existen
 * @throws {Conflicto} si la placa nueva ya pertenece a otro vehículo
 * @throws {SolicitudInvalida} si la placa resultante no corresponde al tipo resultante
 */
const actualizarVehiculo = (id, datos) => {
  const vehiculo = obtenerVehiculoOFallar(id);

  if (datos.placa && datos.placa !== vehiculo.placa) {
    const otroVehiculoConPlaca = buscarPorPlaca(datos.placa);
    if (otroVehiculoConPlaca) {
      throw new Conflicto('Ya existe un vehículo con esa placa');
    }
  }

  const tipoResultante = datos.tipo ?? vehiculo.tipo;
  const placaResultante = datos.placa ?? vehiculo.placa;
  validarPlacaCorrespondeATipo(placaResultante, tipoResultante);

  if (datos.clienteId !== undefined) {
    clientesService.obtenerClienteOFallar(datos.clienteId);
  }

  Object.assign(vehiculo, {
    placa: datos.placa ?? vehiculo.placa,
    tipo: datos.tipo ?? vehiculo.tipo,
    marca: datos.marca ?? vehiculo.marca,
    color: datos.color ?? vehiculo.color,
    clienteId: datos.clienteId !== undefined ? Number(datos.clienteId) : vehiculo.clienteId,
  });

  return vehiculo;
};

/**
 * Elimina un vehículo por id.
 *
 * La verificación "no tiene lavados" (409) se conecta cuando exista
 * ordenesLavado.service.js, con el mismo patrón que clienteTieneVehiculos.
 *
 * @param {number|string} id
 * @throws {NoEncontrado} si el id no existe
 */
const eliminarVehiculo = (id) => {
  const vehiculo = obtenerVehiculoOFallar(id);
  const indice = vehiculos.indexOf(vehiculo);
  vehiculos.splice(indice, 1);
};

module.exports = {
  listarVehiculos,
  obtenerVehiculoPorId,
  obtenerVehiculoOFallar,
  clienteTieneVehiculos,
  crearVehiculo,
  actualizarVehiculo,
  eliminarVehiculo,
};
