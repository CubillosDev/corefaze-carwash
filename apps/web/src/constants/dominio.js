import contrato from '@contratos/dominio.json';

/*
 * Constantes del dominio leídas del contrato compartido
 * packages/contratos/dominio.json: la API y el panel usan la misma fuente.
 * Los nombres y las formas replican los de apps/api/src/constants/dominio.js.
 */

function congelarProfundo(objeto) {
  for (const valor of Object.values(objeto)) {
    if (typeof valor === 'object' && valor !== null) {
      congelarProfundo(valor);
    }
  }
  return Object.freeze(objeto);
}

/** Convierte ['en_proceso'] en { EN_PROCESO: 'en_proceso' }. */
function aEnumeracion(valores) {
  return Object.freeze(Object.fromEntries(valores.map((valor) => [valor.toUpperCase(), valor])));
}

// structuredClone evita congelar el módulo JSON que Vite comparte.
const dominio = congelarProfundo(structuredClone(contrato));

export const ESTADOS_ORDEN = aEnumeracion(dominio.estadosOrden);
export const ESTADOS_ORDEN_ABIERTOS = dominio.estadosOrdenAbiertos;
export const ESTADOS_ORDEN_CERRADOS = dominio.estadosOrdenCerrados;
export const TRANSICIONES_ORDEN = dominio.transicionesOrden;
export const MEDIOS_PAGO = aEnumeracion(dominio.mediosPago);
export const TIPOS_VEHICULO = aEnumeracion(dominio.tiposVehiculo);
export const TIPOS_VEHICULO_MOTO = dominio.tiposVehiculoMoto;
export const ESTADOS_ACTIVIDAD = aEnumeracion(dominio.estadosActividad);
export const SERVICIOS_CON_LAVADO_MOTOR = dominio.serviciosConLavadoMotor;
export const LIMITES = dominio.limites;
export const ROLES = dominio.roles;
export const TIPOS_CLIENTE = aEnumeracion(dominio.tiposCliente);
export const TIPOS_VINCULACION = aEnumeracion(dominio.tiposVinculacion);
export const DIAS_GRACIA_CODIGO_COLABORADOR = dominio.diasGraciaCodigoColaborador;
export const ESTADOS_JORNADA = aEnumeracion(dominio.estadosJornada);

export const PATRONES_PLACA = Object.freeze({
  CARRO: new RegExp(dominio.patronesPlaca.carro),
  MOTO: new RegExp(dominio.patronesPlaca.moto),
});
