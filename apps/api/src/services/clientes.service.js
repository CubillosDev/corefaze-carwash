const clientes = require('../data/clientes');
const { TIPOS_CLIENTE, ESTADOS_ACTIVIDAD } = require('../constants/dominio');
const { Conflicto, NoEncontrado } = require('../utils/errores');

/**
 * Busca un cliente por su documento (comparación exacta: el documento es
 * un identificador oficial, no un texto libre que normalizar como el email).
 * @param {string} documento
 * @returns {object | undefined}
 */
const buscarPorDocumento = (documento) =>
  clientes.find((cliente) => cliente.documento === documento);

/**
 * Lista todos los clientes.
 * @returns {object[]}
 */
const listarClientes = () => clientes;

/**
 * Obtiene un cliente por id.
 * @param {number|string} id
 * @returns {object | null}
 */
const obtenerClientePorId = (id) => {
  const cliente = clientes.find((candidato) => candidato.id === Number(id));
  return cliente ?? null;
};

/**
 * Obtiene un cliente por id, o lanza NoEncontrado (404) si no existe.
 * Los otros recursos que referencien clienteId usan esta función para
 * validar la relación antes de crear su propio registro.
 *
 * @param {number|string} id
 * @returns {object}
 * @throws {NoEncontrado}
 */
const obtenerClienteOFallar = (id) => {
  const cliente = obtenerClientePorId(id);
  if (!cliente) {
    throw new NoEncontrado('Cliente no encontrado');
  }
  return cliente;
};

/**
 * Crea un cliente nuevo.
 *
 * Allowlisting explícito (igual que en usuarios.service.js): el objeto se
 * arma campo por campo desde `datos`, nunca con spread de todo el body.
 *
 * Reglas de negocio:
 * - El documento debe ser único (409 si ya existe).
 * - creditoHabilitado solo puede ser true si tipo === "empresa"; si el
 *   cliente es particular, se fuerza a false sin importar qué envíe el cliente.
 * - Todo cliente nuevo nace "activo".
 *
 * @param {{ nombre: string, documento: string, tipo: string, telefono: string, email?: string, creditoHabilitado?: boolean }} datos
 * @returns {object} el cliente creado
 */
const crearCliente = (datos) => {
  if (buscarPorDocumento(datos.documento)) {
    throw new Conflicto('Ya existe un cliente con ese documento');
  }

  const nuevoCliente = {
    id: clientes.length > 0 ? Math.max(...clientes.map((cliente) => cliente.id)) + 1 : 1,
    nombre: datos.nombre,
    documento: datos.documento,
    tipo: datos.tipo,
    telefono: datos.telefono,
    email: datos.email ?? null,
    // Solo una empresa puede tener crédito habilitado; nunca un particular,
    // sin importar qué haya enviado el cliente de la API.
    creditoHabilitado:
      datos.tipo === TIPOS_CLIENTE.EMPRESA ? Boolean(datos.creditoHabilitado) : false,
    estado: ESTADOS_ACTIVIDAD.ACTIVO,
  };

  clientes.push(nuevoCliente);
  return nuevoCliente;
};

/**
 * Actualiza un cliente existente.
 *
 * Mismas reglas que crearCliente: documento único (excluyendo al propio
 * cliente que se está editando) y creditoHabilitado atado a tipo === "empresa".
 *
 * @param {number|string} id
 * @param {{ nombre?: string, documento?: string, tipo?: string, telefono?: string, email?: string, creditoHabilitado?: boolean, estado?: string }} datos
 * @returns {object} el cliente actualizado
 * @throws {NoEncontrado} si el id no existe
 * @throws {Conflicto} si el documento nuevo ya pertenece a otro cliente
 */
const actualizarCliente = (id, datos) => {
  const cliente = obtenerClienteOFallar(id);

  if (datos.documento && datos.documento !== cliente.documento) {
    const otroClienteConDocumento = buscarPorDocumento(datos.documento);
    if (otroClienteConDocumento) {
      throw new Conflicto('Ya existe un cliente con ese documento');
    }
  }

  const tipoResultante = datos.tipo ?? cliente.tipo;
  const creditoSolicitado = datos.creditoHabilitado ?? cliente.creditoHabilitado;

  Object.assign(cliente, {
    nombre: datos.nombre ?? cliente.nombre,
    documento: datos.documento ?? cliente.documento,
    tipo: tipoResultante,
    telefono: datos.telefono ?? cliente.telefono,
    email: datos.email ?? cliente.email,
    creditoHabilitado:
      tipoResultante === TIPOS_CLIENTE.EMPRESA ? Boolean(creditoSolicitado) : false,
    estado: datos.estado ?? cliente.estado,
  });

  return cliente;
};

/**
 * Elimina un cliente por id.
 *
 * La verificación de "no tiene vehículos" (409) vive en el controller,
 * llamando a vehiculosService.clienteTieneVehiculos(id) — el estándar del
 * proyecto (sección 5.3) exige que esa función viva en el service del
 * recurso que tiene la llave foránea (Vehículos), no aquí.
 *
 * @param {number|string} id
 * @throws {NoEncontrado} si el id no existe
 */
const eliminarCliente = (id) => {
  const cliente = obtenerClienteOFallar(id);
  const indice = clientes.indexOf(cliente);
  clientes.splice(indice, 1);
};

module.exports = {
  listarClientes,
  obtenerClientePorId,
  obtenerClienteOFallar,
  crearCliente,
  actualizarCliente,
  eliminarCliente,
};
