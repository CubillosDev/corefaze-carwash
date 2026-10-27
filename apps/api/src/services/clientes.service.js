const { supabase, crearClienteConUsuario } = require('../db/supabaseCliente');
const { aCamelCase } = require('../utils/mapearCampos');
const { TIPOS_CLIENTE } = require('../constants/dominio');
const { Conflicto, NoEncontrado } = require('../utils/errores');
const { crearTraductorErroresPostgres } = require('../utils/traducirErrorPostgres');

// Nunca *: así nunca se filtran creado_en/actualizado_en mientras el
// contrato HTTP no las incluya (ver supabase/README.md, "Contrato de
// integración con la API").
const COLUMNAS = 'id, nombre, documento, tipo, telefono, email, credito_habilitado, estado';

/**
 * Traduce un error de Postgres (vía supabase-js) a una de las clases de
 * utils/errores.js. Los códigos son los que la migración de `clientes`
 * puede disparar (ver docs/arquitectura/diagramas/modelo-datos.md).
 */
const traducirErrorPostgres = crearTraductorErroresPostgres({
  tabla: 'clientes',
  etiqueta: 'cliente',
  mapeo: {
    // 23505 unique_violation: documento duplicado (clientes_documento_key).
    23505: () => new Conflicto('Ya existe un cliente con ese documento'),
    // 23503 foreign_key_violation al borrar: vehiculos.cliente_id (restrict).
    23503: () => new Conflicto('No se puede eliminar un cliente con vehículos asociados'),
  },
});

/**
 * Lista todos los clientes.
 * @returns {Promise<object[]>}
 */
const listarClientes = async () => {
  const { data, error } = await supabase.from('clientes').select(COLUMNAS);

  if (error) {
    throw new Error(`No se pudo listar clientes: ${error.message}`);
  }

  return aCamelCase(data);
};

/**
 * Obtiene un cliente por id.
 * @param {number|string} id
 * @returns {Promise<object | null>}
 */
const obtenerClientePorId = async (id) => {
  const { data, error } = await supabase
    .from('clientes')
    .select(COLUMNAS)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo obtener el cliente: ${error.message}`);
  }

  return data ? aCamelCase(data) : null;
};

/**
 * Obtiene un cliente por id, o lanza NoEncontrado (404) si no existe.
 * Los otros recursos que referencien clienteId usan esta función para
 * validar la relación antes de crear su propio registro.
 *
 * @param {number|string} id
 * @returns {Promise<object>}
 * @throws {NoEncontrado}
 */
const obtenerClienteOFallar = async (id) => {
  const cliente = await obtenerClientePorId(id);
  if (!cliente) {
    throw new NoEncontrado('Cliente no encontrado');
  }
  return cliente;
};

/**
 * Crea un cliente nuevo.
 *
 * Reglas de negocio:
 * - El documento debe ser único (409 si ya existe) — lo rechaza el
 *   UNIQUE de la BD, traducido por traducirErrorPostgres.
 * - creditoHabilitado solo puede ser true si tipo === "empresa"; si el
 *   cliente es particular, se fuerza a false sin importar qué envíe el
 *   cliente (la BD también lo protege con un CHECK, pero forzarlo aquí
 *   evita el viaje de ida y vuelta: da un resultado silencioso, no un error).
 * - Todo cliente nuevo nace "activo" (default de la columna `estado`).
 *
 * @param {{ nombre: string, documento: string, tipo: string, telefono: string, email?: string, creditoHabilitado?: boolean }} datos
 * @param {number} usuarioId quién hace el cambio (lo lee registrar_auditoria())
 * @returns {Promise<object>} el cliente creado
 */
const crearCliente = async (datos, usuarioId) => {
  const fila = {
    nombre: datos.nombre,
    documento: datos.documento,
    tipo: datos.tipo,
    telefono: datos.telefono,
    email: datos.email ?? null,
    credito_habilitado:
      datos.tipo === TIPOS_CLIENTE.EMPRESA ? Boolean(datos.creditoHabilitado) : false,
  };

  const { data, error } = await crearClienteConUsuario(usuarioId)
    .from('clientes')
    .insert(fila)
    .select(COLUMNAS)
    .single();

  if (error) {
    throw traducirErrorPostgres(error);
  }

  return aCamelCase(data);
};

/**
 * Actualiza un cliente existente.
 *
 * Mismas reglas que crearCliente: documento único (lo rechaza el UNIQUE)
 * y creditoHabilitado atado a tipo === "empresa". El tipo resultante
 * puede depender de un valor ya guardado (si datos.tipo no viene en la
 * petición), así que primero se lee el cliente actual.
 *
 * @param {number|string} id
 * @param {{ nombre?: string, documento?: string, tipo?: string, telefono?: string, email?: string, creditoHabilitado?: boolean, estado?: string }} datos
 * @param {number} usuarioId quién hace el cambio (lo lee registrar_auditoria())
 * @returns {Promise<object>} el cliente actualizado
 * @throws {NoEncontrado} si el id no existe
 */
const actualizarCliente = async (id, datos, usuarioId) => {
  const clienteActual = await obtenerClienteOFallar(id);

  const tipoResultante = datos.tipo ?? clienteActual.tipo;
  const creditoSolicitado = datos.creditoHabilitado ?? clienteActual.creditoHabilitado;

  const cambios = {
    nombre: datos.nombre ?? clienteActual.nombre,
    documento: datos.documento ?? clienteActual.documento,
    tipo: tipoResultante,
    telefono: datos.telefono ?? clienteActual.telefono,
    email: datos.email ?? clienteActual.email,
    credito_habilitado:
      tipoResultante === TIPOS_CLIENTE.EMPRESA ? Boolean(creditoSolicitado) : false,
    estado: datos.estado ?? clienteActual.estado,
  };

  const { data, error } = await crearClienteConUsuario(usuarioId)
    .from('clientes')
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
 * Elimina un cliente por id.
 *
 * La verificación de "no tiene vehículos" (409) vive primero en el
 * controller, llamando a vehiculosService.clienteTieneVehiculos(id) — el
 * estándar del proyecto (sección 5.3). La FK vehiculos.cliente_id
 * (restrict) es la defensa adicional si esa verificación quedó
 * desactualizada: por eso traducirErrorPostgres también mapea 23503 aquí.
 *
 * @param {number|string} id
 * @param {number} usuarioId quién hace el cambio (lo lee registrar_auditoria())
 * @throws {NoEncontrado} si el id no existe
 */
const eliminarCliente = async (id, usuarioId) => {
  await obtenerClienteOFallar(id);

  const { error } = await crearClienteConUsuario(usuarioId).from('clientes').delete().eq('id', id);

  if (error) {
    throw traducirErrorPostgres(error);
  }
};

module.exports = {
  listarClientes,
  obtenerClientePorId,
  obtenerClienteOFallar,
  crearCliente,
  actualizarCliente,
  eliminarCliente,
};
