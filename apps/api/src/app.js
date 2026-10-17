const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');

const { env } = require('./config/env');
const { documentoSwagger } = require('./docs/swagger');
const { construirRegistrosApiKeys } = require('./data/apiKeys');
const { crearServicioApiKeys } = require('./services/apiKeys.service');
const { crearMiddlewareApiKey } = require('./middlewares/apiKey.middleware');
const { rutaNoEncontrada, manejarErrores } = require('./middlewares/errores.middleware');
const rutasSalud = require('./routes/salud.routes');
const rutasSeguridad = require('./routes/seguridad.routes');
const rutasAuth = require('./routes/auth.routes');
const rutasClientes = require('./routes/clientes.routes');
const rutasVehiculos = require('./routes/vehiculos.routes');
const rutasColaboradores = require('./routes/colaboradores.routes');
const rutasServicios = require('./routes/servicios.routes');
const rutasOrdenesLavado = require('./routes/ordenesLavado.routes');
const rutasJornadas = require('./routes/jornadas.routes');

const LIMITE_CUERPO = '10kb';

/**
 * Construye la aplicación Express SIN ponerla a escuchar (eso lo hace server.js).
 * Recibir la configuración como parámetro permite probarla con Supertest,
 * sin abrir un puerto y con cualquier conjunto de llaves u origen.
 *
 * @param {{ apiKeys: { postman: string, admin: string, movil: string }, origenPermitido: string }} configuracion
 */
const crearApp = ({ apiKeys, origenPermitido } = env) => {
  const app = express();

  const servicioApiKeys = crearServicioApiKeys(construirRegistrosApiKeys(apiKeys));
  const validarApiKey = crearMiddlewareApiKey(servicioApiKeys);

  // Helmet va primero, antes de cualquier ruta (incluida la
  // documentación): así su CSP protege también a /api-docs, no solo a
  // /api/*. No hace falta tocar el CSP por defecto de Helmet para que
  // Swagger UI funcione: swagger-ui-express@5 sirve swagger-ui-bundle.js,
  // swagger-ui-standalone-preset.js y swagger-ui-init.js (con el spec ya
  // embebido) como archivos same-origin via <script src="...">, nunca como
  // <script> en línea — verificado inspeccionando el HTML y esos tres
  // archivos servidos. script-src 'self' (el valor por defecto) ya los
  // permite.
  app.use(helmet());

  // Documentación interactiva.
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(documentoSwagger));

  app.use(cors({ origin: origenPermitido }));
  app.use(express.json({ limit: LIMITE_CUERPO }));

  // Rutas públicas
  app.use('/api/salud', rutasSalud);

  // Desde aquí, todo lo que cuelgue de /api exige la API Key
  app.use('/api', validarApiKey);

  app.use('/api/seguridad', rutasSeguridad);
  app.use('/api/auth', rutasAuth);
  app.use('/api/clientes', rutasClientes);
  app.use('/api/vehiculos', rutasVehiculos);
  app.use('/api/colaboradores', rutasColaboradores);
  app.use('/api/servicios', rutasServicios);
  app.use('/api/ordenes-lavado', rutasOrdenesLavado);
  app.use('/api/jornadas', rutasJornadas);

  app.use(rutaNoEncontrada);
  app.use(manejarErrores);

  return app;
};

module.exports = { crearApp };
