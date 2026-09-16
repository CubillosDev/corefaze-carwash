let vehiculos = [
  { id: 1, placa: "ABC123", tipoVehiculo: "automovil", marca: "Chevrolet", color: "Blanco", clienteId: null },
  { id: 2, placa: "EBS901", tipoVehiculo: "camioneta", marca: "Toyota", color: "Gris", clienteId: 1 },
  { id: 3, placa: "XYZ12A", tipoVehiculo: "moto_hasta_150cc", marca: "AKT", color: "Rojo", clienteId: null },
  { id: 4, placa: "DEF456", tipoVehiculo: "automovil", marca: "Renault", color: "Negro", clienteId: 3 },
];

let siguienteId = vehiculos.length + 1;
const obtenerSiguienteId = () => siguienteId++;

module.exports = { vehiculos, obtenerSiguienteId };