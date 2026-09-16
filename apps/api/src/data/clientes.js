let clientes = [
  { id: 1, nombre: "EBSA", documento: "900123456-1", telefono: "6087401234", tieneCredito: true, estado: "activo" },
  { id: 2, nombre: "Corpoboyaca", documento: "891801234-2", telefono: "6087405678", tieneCredito: true, estado: "activo" },
  { id: 3, nombre: "Ana Maria Vargas", documento: "1052345678", telefono: "3134567890", tieneCredito: false, estado: "activo" },
];

let siguienteId = clientes.length + 1;
const obtenerSiguienteId = () => siguienteId++;

module.exports = { clientes, obtenerSiguienteId };