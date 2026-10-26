const { supabase, crearClienteConUsuario } = require('../db/supabaseCliente');
const { aCamelCase } = require('../utils/mapearCampos');
const clientesService = require('./clientes.service');
const { TIPOS_VEHICULO_MOTO, PATRONES_PLACA } = require('../constants/dominio');
const { Conflicto, NoEncontrado, SolicitudInvalida } = require('../utils/errores');

// Nunca *: así nunca se filtran creado_en/actualizado_en mientras el
// contrato HTTP no las incluya (ver supabase/README.md, "Contrato de
// integración con la API").
const COLUMNAS = 'id, placa, tipo_vehiculo, marca, color, cliente_id';

/**
 * Traduce un error de Postgres (vía supabase-js) a una de las clases de
 * utils/errores.js. Los códigos son los que la migración de `vehiculos`
 * puede disparar (ver docs/arquitectura/diagramas/modelo-datos.md).
 */
const traducirErrorPostgres = (error) => {
  // 23505 unique_violation: placa duplicada (vehiculos_placa_key).
  if (error.code === '23505') {
    return new Conflicto('Ya existe un vehículo con esa placa');
  }

  // 23503 foreign_key_violation al borrar: ordenes_lavado.vehiculo_id (restrict).
  if (error.code === '23503') {
    return new Conflicto('No se puede eliminar un vehículo con órdenes de lavado asociadas');
  }

  // 23514 check_violation: formato o regla de negocio de la tabla vehiculos.
  if (error.code === '23514') {
    return new SolicitudInvalida([], 'Datos de vehículo inválidos');
  }

  return new Error(`Error de base de datos en vehiculos: ${error.message}`);
};

/**
 * Lista todos los vehículos.
 * @returns {Promise<object[]>}
 */
const listarVehiculos = async () => {
  const { data, error } = await supabase.from('vehiculos').select(COLUMNAS);

  if (error) {
    throw new Error(`No se pudo listar vehiculos: ${error.message}`);
  }

  return aCamelCase(data);
};

/**
 * Obtiene un vehículo por id.
 * @param {number|string} id
 * @returns {Promise<object | null>}
 */
const obtenerVehiculoPorId = async (id) => {
  const { data, error } = await supabase
    .from('vehiculos')
    .select(COLUMNAS)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo obtener el vehículo: ${error.message}`);
  }

  return data ? aCamelCase(data) : null;
};

/**
 * Obtiene un vehículo por id, o lanza NoEncontrado (404).
 * @param {number|string} id
 * @returns {Promise<object>}
 * @throws {NoEncontrado}
 */
const obtenerVehiculoOFallar = async (id) => {
  const vehiculo = await obtenerVehiculoPorId(id);
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
 * Usa count 'exact' con head: true para no traer filas (ni toparse con el
 * límite de PostgREST, ver informe de la Etapa A): solo necesita saber si
 * el conteo es mayor que 0.
 *
 * @param {number|string} clienteId
 * @returns {Promise<boolean>}
 */
const clienteTieneVehiculos = async (clienteId) => {
  const { count, error } = await supabase
    .from('vehiculos')
    .select('id', { count: 'exact', head: true })
    .eq('cliente_id', clienteId);

  if (error) {
    throw new Error(`No se pudo verificar los vehículos del cliente: ${error.message}`);
  }

  return count > 0;
};

const esTipoMoto = (tipoVehiculo) => TIPOS_VEHICULO_MOTO.includes(tipoVehiculo);

/**
 * La placa debe corresponder exactamente al tipo de vehículo (no una placa
 * de moto en un automóvil, ni viceversa). La BD también protege esto con
 * `vehiculos_placa_tipo_check`, pero este chequeo se queda: da un mensaje
 * de campo específico (como ya hacía en memoria) en vez del genérico
 * "Datos de vehículo inválidos" que deja un 23514 traducido. Además, en
 * una actualización el tipoVehiculo puede no venir en la petición, y hace
 * falta el vehículo ya guardado para resolverlo.
 *
 * @param {string} placa
 * @param {string} tipoVehiculo
 * @throws {SolicitudInvalida} si no corresponden
 */
const validarPlacaCorrespondeATipo = (placa, tipoVehiculo) => {
  const patronEsperado = esTipoMoto(tipoVehiculo) ? PATRONES_PLACA.MOTO : PATRONES_PLACA.CARRO;

  if (!patronEsperado.test(placa)) {
    throw new SolicitudInvalida([
      {
        campo: 'placa',
        mensaje: `La placa no corresponde al formato de ${esTipoMoto(tipoVehiculo) ? 'moto' : 'carro'}`,
      },
    ]);
  }
};

/**
 * Crea un vehículo nuevo.
 *
 * Reglas de negocio:
 * - La placa debe ser única (409 si ya existe) — lo rechaza el UNIQUE de
 *   la BD, traducido por traducirErrorPostgres.
 * - La placa debe corresponder al tipoVehiculo (400 si no).
 * - clienteId debe existir (404 si no) — se delega a clientesService,
 *   consultando ya la tabla real.
 *
 * @param {{ placa: string, tipoVehiculo: string, marca?: string, color?: string, clienteId: number }} datos
 * @param {number} usuarioId quién hace el cambio (lo lee registrar_auditoria())
 * @returns {Promise<object>} el vehículo creado
 */
const crearVehiculo = async (datos, usuarioId) => {
  validarPlacaCorrespondeATipo(datos.placa, datos.tipoVehiculo);

  // Lanza NoEncontrado (404) si el cliente no existe; no seguimos si falla.
  await clientesService.obtenerClienteOFallar(datos.clienteId);

  const fila = {
    placa: datos.placa,
    tipo_vehiculo: datos.tipoVehiculo,
    marca: datos.marca ?? null,
    color: datos.color ?? null,
    cliente_id: datos.clienteId,
  };

  const { data, error } = await crearClienteConUsuario(usuarioId)
    .from('vehiculos')
    .insert(fila)
    .select(COLUMNAS)
    .single();

  if (error) {
    throw traducirErrorPostgres(error);
  }

  return aCamelCase(data);
};

/**
 * Actualiza un vehículo existente.
 *
 * @param {number|string} id
 * @param {{ placa?: string, tipoVehiculo?: string, marca?: string, color?: string, clienteId?: number }} datos
 * @param {number} usuarioId quién hace el cambio (lo lee registrar_auditoria())
 * @returns {Promise<object>} el vehículo actualizado
 * @throws {NoEncontrado} si el vehículo o el nuevo clienteId no existen
 * @throws {Conflicto} si la placa nueva ya pertenece a otro vehículo
 * @throws {SolicitudInvalida} si la placa resultante no corresponde al tipoVehiculo resultante
 */
const actualizarVehiculo = async (id, datos, usuarioId) => {
  const vehiculoActual = await obtenerVehiculoOFallar(id);

  const tipoVehiculoResultante = datos.tipoVehiculo ?? vehiculoActual.tipoVehiculo;
  const placaResultante = datos.placa ?? vehiculoActual.placa;
  validarPlacaCorrespondeATipo(placaResultante, tipoVehiculoResultante);

  if (datos.clienteId !== undefined) {
    await clientesService.obtenerClienteOFallar(datos.clienteId);
  }

  const cambios = {
    placa: datos.placa ?? vehiculoActual.placa,
    tipo_vehiculo: datos.tipoVehiculo ?? vehiculoActual.tipoVehiculo,
    marca: datos.marca ?? vehiculoActual.marca,
    color: datos.color ?? vehiculoActual.color,
    cliente_id: datos.clienteId ?? vehiculoActual.clienteId,
  };

  const { data, error } = await crearClienteConUsuario(usuarioId)
    .from('vehiculos')
    .update(cambios)
    .eq('id', id)
    .select(COLUMNAS)
    .single();

  if (error) {
    throw traducirErrorPostgres(error);
  }

  return aCamelCase(data);
};

/**
 * Elimina un vehículo por id.
 *
 * La verificación de "no tiene órdenes" (409) vive primero en el
 * controller, llamando a ordenesLavadoService.vehiculoTieneOrdenes(id). La
 * FK ordenes_lavado.vehiculo_id (restrict) es la defensa adicional si esa
 * verificación quedó desactualizada.
 *
 * @param {number|string} id
 * @param {number} usuarioId quién hace el cambio (lo lee registrar_auditoria())
 * @throws {NoEncontrado} si el id no existe
 */
const eliminarVehiculo = async (id, usuarioId) => {
  await obtenerVehiculoOFallar(id);

  const { error } = await crearClienteConUsuario(usuarioId).from('vehiculos').delete().eq('id', id);

  if (error) {
    throw traducirErrorPostgres(error);
  }
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
