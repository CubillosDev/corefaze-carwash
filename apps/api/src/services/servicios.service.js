const servicios = require('../data/servicios');
const { SERVICIOS_CON_LAVADO_MOTOR } = require('../constants/dominio');
const { Conflicto, NoEncontrado, SolicitudInvalida } = require('../utils/errores');

/**
 * Busca un servicio por su número de catálogo (distinto del id interno).
 * @param {number|string} numero
 * @returns {object | undefined}
 */
const buscarPorNumero = (numero) =>
  servicios.find((servicio) => servicio.numero === Number(numero));

/**
 * R3: dentro de un mismo servicio no puede haber dos tarifas para el
 * mismo tipo de vehículo (sería ambiguo cuál aplica).
 *
 * @param {Array<{ tipoVehiculo: string, valor: number }>} tarifas
 * @returns {boolean}
 */
const tieneTipoVehiculoDuplicado = (tarifas) => {
  const tipos = tarifas.map((tarifa) => tarifa.tipoVehiculo);
  return new Set(tipos).size !== tipos.length;
};

/**
 * Defensa en profundidad: aunque el validador ya debería atrapar
 * duplicados de tipoVehiculo en tarifas, el service lo vuelve a exigir
 * antes de persistir.
 *
 * @param {Array<{ tipoVehiculo: string, valor: number }>} tarifas
 * @throws {SolicitudInvalida} si hay un tipoVehiculo repetido
 */
const validarTarifasSinDuplicados = (tarifas) => {
  if (tieneTipoVehiculoDuplicado(tarifas)) {
    throw new SolicitudInvalida([
      { campo: 'tarifas', mensaje: 'No puede haber dos tarifas para el mismo tipo de vehículo' },
    ]);
  }
};

/**
 * Lista todos los servicios.
 * @returns {object[]}
 */
const listarServicios = () => servicios;

/**
 * Obtiene un servicio por id.
 * @param {number|string} id
 * @returns {object | null}
 */
const obtenerServicioPorId = (id) => {
  const servicio = servicios.find((candidato) => candidato.id === Number(id));
  return servicio ?? null;
};

/**
 * Obtiene un servicio por id, o lanza NoEncontrado (404). Otros recursos
 * (Órdenes de lavado, a futuro) usan esta función para validar
 * servicioId antes de crear su propio registro.
 *
 * @param {number|string} id
 * @returns {object}
 * @throws {NoEncontrado}
 */
const obtenerServicioOFallar = (id) => {
  const servicio = obtenerServicioPorId(id);
  if (!servicio) {
    throw new NoEncontrado('Servicio no encontrado');
  }
  return servicio;
};

/**
 * Integridad referencial (patrón <entidad>Tiene<Relacion>() del estándar):
 * se conecta aquí cuando exista ordenesLavado.service.js, que es quien
 * tiene la llave foránea servicioId.
 *
 * TODO(ordenesLavado): reemplazar este placeholder por la llamada real:
 *   return ordenesLavadoService.servicioTieneOrdenes(servicioId);
 * Hasta entonces, nunca bloquea la eliminación (siempre false).
 *
 * @param {number|string} _servicioId
 * @returns {boolean}
 */
const servicioTieneOrdenes = (_servicioId) => false;

/**
 * R3: el servicio debe tener tarifa definida para el tipo de vehículo
 * (un servicio de motos no aplica a una camioneta). Órdenes de lavado
 * la usará para resolver el valor a cobrar.
 *
 * @param {object} servicio
 * @param {string} tipoVehiculo
 * @returns {number} el valor de la tarifa
 * @throws {Conflicto} si el servicio no tiene tarifa para ese tipo de vehículo
 */
const obtenerTarifaParaTipoVehiculo = (servicio, tipoVehiculo) => {
  const tarifa = servicio.tarifas.find((entrada) => entrada.tipoVehiculo === tipoVehiculo);
  if (!tarifa) {
    throw new Conflicto('El servicio no tiene tarifa definida para ese tipo de vehículo');
  }
  return tarifa.valor;
};

/**
 * R7: los servicios cuyo número está en SERVICIOS_CON_LAVADO_MOTOR
 * incluyen lavado de motor y requieren autorización explícita. Recibe
 * el número de catálogo (no el id interno), porque así está definida
 * la regla en el dominio compartido.
 *
 * @param {number|string} numero
 * @returns {boolean}
 */
const requiereAutorizacionMotor = (numero) => SERVICIOS_CON_LAVADO_MOTOR.includes(Number(numero));

/**
 * Crea un servicio nuevo.
 *
 * Reglas de negocio:
 * - El número es único (409 si ya existe).
 * - Las tarifas no pueden repetir tipoVehiculo (400 si ocurre).
 * - Todo servicio nuevo nace activo, sin importar qué venga en datos.
 *
 * @param {{ numero: number, nombre: string, descripcion: string, categoria: string, tarifas: Array<{ tipoVehiculo: string, valor: number }> }} datos
 * @returns {object} el servicio creado
 */
const crearServicio = (datos) => {
  if (buscarPorNumero(datos.numero)) {
    throw new Conflicto('Ya existe un servicio con ese número');
  }

  validarTarifasSinDuplicados(datos.tarifas);

  const nuevoServicio = {
    id: servicios.length > 0 ? Math.max(...servicios.map((servicio) => servicio.id)) + 1 : 1,
    numero: Number(datos.numero),
    nombre: datos.nombre,
    descripcion: datos.descripcion,
    categoria: datos.categoria,
    tarifas: datos.tarifas,
    activo: true,
  };

  servicios.push(nuevoServicio);
  return nuevoServicio;
};

/**
 * Actualiza un servicio existente. Si se envía tarifas, reemplaza el
 * arreglo completo (no se fusiona con el anterior).
 *
 * @param {number|string} id
 * @param {{ numero?: number, nombre?: string, descripcion?: string, categoria?: string, tarifas?: Array<{ tipoVehiculo: string, valor: number }>, activo?: boolean }} datos
 * @returns {object} el servicio actualizado
 * @throws {NoEncontrado} si el id no existe
 * @throws {Conflicto} si el número nuevo ya pertenece a otro servicio
 * @throws {SolicitudInvalida} si las tarifas nuevas repiten tipoVehiculo
 */
const actualizarServicio = (id, datos) => {
  const servicio = obtenerServicioOFallar(id);

  if (datos.numero !== undefined && Number(datos.numero) !== servicio.numero) {
    if (buscarPorNumero(datos.numero)) {
      throw new Conflicto('Ya existe un servicio con ese número');
    }
  }

  if (datos.tarifas !== undefined) {
    validarTarifasSinDuplicados(datos.tarifas);
  }

  Object.assign(servicio, {
    numero: datos.numero !== undefined ? Number(datos.numero) : servicio.numero,
    nombre: datos.nombre ?? servicio.nombre,
    descripcion: datos.descripcion ?? servicio.descripcion,
    categoria: datos.categoria ?? servicio.categoria,
    tarifas: datos.tarifas ?? servicio.tarifas,
    activo: datos.activo ?? servicio.activo,
  });

  return servicio;
};

/**
 * Elimina un servicio por id.
 *
 * La verificación "no tiene órdenes" (409) vive en el controller, igual
 * que en clientes.controller.js / vehiculos.controller.js.
 *
 * @param {number|string} id
 * @throws {NoEncontrado} si el id no existe
 */
const eliminarServicio = (id) => {
  const servicio = obtenerServicioOFallar(id);
  const indice = servicios.indexOf(servicio);
  servicios.splice(indice, 1);
};

module.exports = {
  listarServicios,
  obtenerServicioPorId,
  obtenerServicioOFallar,
  servicioTieneOrdenes,
  obtenerTarifaParaTipoVehiculo,
  requiereAutorizacionMotor,
  crearServicio,
  actualizarServicio,
  eliminarServicio,
};
