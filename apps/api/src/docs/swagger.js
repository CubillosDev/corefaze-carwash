const swaggerJsdoc = require('swagger-jsdoc');

/**
 * Definición base del documento OpenAPI. swagger-jsdoc combina esto con los
 * comentarios @swagger que encuentre en los archivos listados en `apis`.
 */
const definicion = {
  openapi: '3.0.0',
  info: {
    title: 'Car Wash API',
    version: '0.1.0',
    description: 'API REST para la gestión de un lavadero de autos.',
  },
  tags: [
    {
      name: 'Salud',
      description: 'Verificación del estado del servicio',
    },
    {
      name: 'Seguridad',
      description: 'Endpoints relacionados con autenticación y seguridad de la API',
    },
    // Aquí se agregarán los tags de cada recurso: Colaboradores, Servicios,
    // Clientes, Vehículos, Órdenes de lavado...
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
      },
    },
  },
  security: [{ ApiKeyAuth: [] }],
};

const opciones = {
  definition: definicion,
  // Rutas donde swagger-jsdoc busca comentarios @swagger, relativas a la raíz de apps/api
  apis: ['./src/routes/*.js'],
};

const documentoSwagger = swaggerJsdoc(opciones);

module.exports = { documentoSwagger };
