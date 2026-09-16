const ESTADOS_ACTIVO_INACTIVO = ["activo", "inactivo"];

const TIPOS_VEHICULO = [
  "automovil",
  "camioneta",
  "platon_7_pasajeros",
  "moto_hasta_150cc",
  "moto_desde_150cc",
];

const MEDIOS_PAGO = [
  "efectivo",
  "nequi",
  "daviplata",
  "bancolombia",
  "datafono",
  "credito",
];

// Maquina de estados de la orden de lavado. Cada llave es un estado de
// origen; el arreglo son los estados a los que se puede transicionar.
const ESTADOS_ORDEN = ["registrada", "en_proceso", "terminada", "entregada", "cancelada"];

const TRANSICIONES_ESTADO_ORDEN = {
  registrada: ["en_proceso", "cancelada"],
  en_proceso: ["terminada", "cancelada"],
  terminada: ["entregada"],
  entregada: [],
  cancelada: [],
};

const ESTADOS_ORDEN_FINALES = ["entregada", "cancelada"];

// Servicios del listado de precios que exigen autorizaMotor: true.
const SERVICIOS_QUE_EXIGEN_AUTORIZACION_MOTOR = [5, 6, 7, 8];

module.exports = {
  ESTADOS_ACTIVO_INACTIVO,
  TIPOS_VEHICULO,
  MEDIOS_PAGO,
  ESTADOS_ORDEN,
  TRANSICIONES_ESTADO_ORDEN,
  ESTADOS_ORDEN_FINALES,
  SERVICIOS_QUE_EXIGEN_AUTORIZACION_MOTOR,
};