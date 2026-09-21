const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const { env } = require('./config/env');
const { crearMiddlewareApiKey } = require('./middlewares/apiKey.middleware');
const { rutaNoEncontrada, manejarErrores } = require('./middlewares/errores.middleware');
const rutasSalud = require('./routes/salud.routes');

const LIMITE_CUERPO = '10kb';

/**
 * Construye la aplicación Express SIN ponerla a escuchar (eso lo hace server.js).
 * Recibir la configuración como parámetro permite probarla con Supertest,
 * sin abrir un puerto y con cualquier llave u origen.
 *
 * @param {{ apiKey: string, origenPermitido: string }} configuracion
 */
const crearApp = ({ apiKey, origenPermitido } = env) => {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: origenPermitido }));
  app.use(express.json({ limit: LIMITE_CUERPO }));

  // Rutas públicas
  app.use('/api/salud', rutasSalud);

  // Desde aquí, todo lo que cuelgue de /api exige la API Key
  app.use('/api', crearMiddlewareApiKey(apiKey));

  // Aquí se montarán los recursos: app.use('/api/colaboradores', rutasColaboradores) ...

  app.use(rutaNoEncontrada);
  app.use(manejarErrores);

  return app;
};

module.exports = { crearApp };
