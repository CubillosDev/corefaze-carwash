const swaggerJsdoc = require("swagger-jsdoc");
const path = require("path");

const definicion = {
  openapi: "3.0.3",
  info: {
    title: "Car Wash API",
    version: "0.1.0",
    description: "API REST para la gestion de un lavadero de vehiculos: clientes, vehiculos, colaboradores, servicios y ordenes de lavado.",
  },
  servers: [{ url: "/api", description: "Prefijo de todos los recursos" }],
  components: {
    schemas: {
      Error: {
        type: "object",
        properties: {
          mensaje: { type: "string" },
          errores: { type: "array", items: { type: "object", properties: { campo: { type: "string" }, mensaje: { type: "string" } } } },
        },
      },
      Cliente: {
        type: "object",
        properties: {
          id: { type: "integer" }, nombre: { type: "string" }, documento: { type: "string" },
          telefono: { type: "string" }, tieneCredito: { type: "boolean" },
          estado: { type: "string", enum: ["activo", "inactivo"] },
        },
      },
      Vehiculo: {
        type: "object",
        properties: {
          id: { type: "integer" }, placa: { type: "string", example: "ABC123" },
          tipoVehiculo: { type: "string", enum: ["automovil", "camioneta", "platon_7_pasajeros", "moto_hasta_150cc", "moto_desde_150cc"] },
          marca: { type: "string", nullable: true }, color: { type: "string", nullable: true },
          clienteId: { type: "integer", nullable: true },
        },
      },
      Colaborador: {
        type: "object",
        properties: {
          id: { type: "integer" }, codigo: { type: "string", example: "401" }, nombre: { type: "string" },
          telefono: { type: "string" }, porcentajeComision: { type: "number", format: "float", example: 0.4 },
          estado: { type: "string", enum: ["activo", "inactivo"] },
        },
      },
      Tarifa: { type: "object", properties: { tipoVehiculo: { type: "string" }, valor: { type: "integer" } } },
      Servicio: {
        type: "object",
        properties: {
          id: { type: "integer" }, numero: { type: "integer" }, nombre: { type: "string" },
          descripcion: { type: "string" }, categoria: { type: "string" },
          tarifas: { type: "array", items: { $ref: "#/components/schemas/Tarifa" } },
          activo: { type: "boolean" },
        },
      },
      OrdenLavado: {
        type: "object",
        properties: {
          id: { type: "integer" }, fecha: { type: "string", format: "date" }, turno: { type: "integer" },
          vehiculoId: { type: "integer" }, servicioId: { type: "integer" }, colaboradorId: { type: "integer" },
          valor: { type: "integer" },
          medioPago: { type: "string", enum: ["efectivo", "nequi", "daviplata", "bancolombia", "datafono", "credito"] },
          clienteId: { type: "integer", nullable: true }, autorizaMotor: { type: "boolean" },
          observaciones: { type: "string" },
          estado: { type: "string", enum: ["registrada", "en_proceso", "terminada", "entregada", "cancelada"] },
        },
      },
    },
    responses: {
      NoEncontrado: { description: "El recurso no existe", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      Conflicto: { description: "Peticion valida pero incompatible con el estado actual", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      DatosInvalidos: { description: "Datos invalidos", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
    },
  },
};

const opciones = { definition: definicion, apis: [path.join(__dirname, "../routes/*.routes.js")] };

module.exports = swaggerJsdoc(opciones);