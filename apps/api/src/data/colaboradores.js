let colaboradores = [
  { id: 1, codigo: "401", nombre: "Wilson Rojas", telefono: "3101234567", porcentajeComision: 0.4, estado: "activo" },
  { id: 2, codigo: "402", nombre: "Fabian Gomez", telefono: "3112345678", porcentajeComision: 0.4, estado: "activo" },
  { id: 3, codigo: "403", nombre: "Yeison Perez", telefono: "3123456789", porcentajeComision: 0.35, estado: "inactivo" },
];

let siguienteId = colaboradores.length + 1;
const obtenerSiguienteId = () => siguienteId++;

module.exports = { colaboradores, obtenerSiguienteId };