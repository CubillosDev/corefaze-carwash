let ordenesLavado = [
  {
    id: 1, fecha: "2026-08-03", turno: 1, vehiculoId: 4, servicioId: 2, colaboradorId: 1,
    valor: 28000, medioPago: "nequi", clienteId: null, autorizaMotor: false,
    observaciones: "Rayon en puerta trasera derecha", estado: "entregada",
  },
  {
    id: 2, fecha: "2026-08-03", turno: 2, vehiculoId: 2, servicioId: 2, colaboradorId: 2,
    valor: 32000, medioPago: "credito", clienteId: 1, autorizaMotor: false,
    observaciones: "", estado: "registrada",
  },
];

let siguienteId = ordenesLavado.length + 1;
const obtenerSiguienteId = () => siguienteId++;

module.exports = { ordenesLavado, obtenerSiguienteId };