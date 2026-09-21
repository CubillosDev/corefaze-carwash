const fs = require('fs');
const path = require('path');
const dominioJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../../../packages/contratos/dominio.json'), 'utf8'),
);

/**
 * Congela un objeto y todo lo que contiene, para que ninguna parte
 * de la API pueda modificar las constantes del dominio por accidente.
 */
const congelarProfundo = (objeto) => {
  Object.values(objeto).forEach((valor) => {
    if (typeof valor === 'object' && valor !== null) {
      congelarProfundo(valor);
    }
  });
  return Object.freeze(objeto);
};

/**
 * Convierte ['en_proceso'] en { EN_PROCESO: 'en_proceso' }, para escribir
 * ESTADOS_ORDEN.EN_PROCESO en el código en lugar de la cadena suelta.
 */
const aEnumeracion = (valores) =>
  Object.freeze(Object.fromEntries(valores.map((valor) => [valor.toUpperCase(), valor])));

// structuredClone evita congelar el objeto que Node guarda en caché
const dominio = congelarProfundo(structuredClone(dominioJson));

const ESTADOS_ORDEN = aEnumeracion(dominio.estadosOrden);
const MEDIOS_PAGO = aEnumeracion(dominio.mediosPago);
const TIPOS_VEHICULO = aEnumeracion(dominio.tiposVehiculo);
const ESTADOS_ACTIVIDAD = aEnumeracion(dominio.estadosActividad);

const PATRONES_PLACA = Object.freeze({
  CARRO: new RegExp(dominio.patronesPlaca.carro),
  MOTO: new RegExp(dominio.patronesPlaca.moto),
});

module.exports = {
  ESTADOS_ORDEN,
  ESTADOS_ORDEN_ABIERTOS: dominio.estadosOrdenAbiertos,
  ESTADOS_ORDEN_CERRADOS: dominio.estadosOrdenCerrados,
  TRANSICIONES_ORDEN: dominio.transicionesOrden,
  MEDIOS_PAGO,
  TIPOS_VEHICULO,
  TIPOS_VEHICULO_MOTO: dominio.tiposVehiculoMoto,
  ESTADOS_ACTIVIDAD,
  SERVICIOS_CON_LAVADO_MOTOR: dominio.serviciosConLavadoMotor,
  PATRONES_PLACA,
  LIMITES: dominio.limites,
};
