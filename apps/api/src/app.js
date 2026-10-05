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

  // Documentación interactiva: se monta ANTES de helmet, porque el CSP por
  // defecto de helmet bloquea el script en línea que usa Swagger UI para
  // arrancar, dejando la página visible pero sin interactividad.
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(documentoSwagger));

  app.use(helmet());
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
  // Aquí se montarán los demás recursos: app.use('/api/colaboradores', ...) ...

  app.use(rutaNoEncontrada);
  app.use(manejarErrores);

  return app;
};

module.exports = { crearApp };
