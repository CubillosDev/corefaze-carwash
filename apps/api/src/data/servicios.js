// tarifas: arreglo de { tipoVehiculo, valor } — un servicio puede no
// aplicar a algunos tipos de vehiculo (R3).
let servicios = [
  {
    id: 1, numero: 1, nombre: "Lavado basico",
    descripcion: "Lavado exterior con agua y jabon", categoria: "lavado",
    tarifas: [
      { tipoVehiculo: "automovil", valor: 18000 },
      { tipoVehiculo: "camioneta", valor: 22000 },
      { tipoVehiculo: "platon_7_pasajeros", valor: 25000 },
    ],
    activo: true,
  },
  {
    id: 2, numero: 2, nombre: "Lavado completo",
    descripcion: "Lavado exterior e interior, aspirado y aromatizado", categoria: "lavado",
    tarifas: [
      { tipoVehiculo: "automovil", valor: 28000 },
      { tipoVehiculo: "camioneta", valor: 32000 },
      { tipoVehiculo: "platon_7_pasajeros", valor: 35000 },
    ],
    activo: true,
  },
  {
    id: 5, numero: 5, nombre: "Lavado de motor",
    descripcion: "Lavado de motor con desengrasante (requiere autorizacion)", categoria: "motor",
    tarifas: [
      { tipoVehiculo: "automovil", valor: 15000 },
      { tipoVehiculo: "camioneta", valor: 18000 },
    ],
    activo: true,
  },
  {
    id: 11, numero: 11, nombre: "Lavado de moto",
    descripcion: "Lavado completo de motocicleta", categoria: "lavado",
    tarifas: [
      { tipoVehiculo: "moto_hasta_150cc", valor: 12000 },
      { tipoVehiculo: "moto_desde_150cc", valor: 15000 },
    ],
    activo: true,
  },
];

let siguienteId = 12;
const obtenerSiguienteId = () => siguienteId++;

module.exports = { servicios, obtenerSiguienteId };