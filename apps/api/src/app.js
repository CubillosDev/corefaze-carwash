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
const rutasParametros = require('./routes/parametros.routes');
const rutasCredito = require('./routes/credito.routes');
const rutasCaja = require('./routes/caja.routes');
const rutasUsuarios = require('./routes/usuarios.routes');
const rutasReportes = require('./routes/reportes.routes');
const rutasNomina = require('./routes/nomina.routes');
const rutasInventario = require('./routes/inventario.routes');
const rutasTrazabilidad = require('./routes/trazabilidad.routes');
const { crearMiddlewareTrazabilidad } = require('./middlewares/trazabilidad.middleware');
const { registroTrazabilidad } = require('./services/trazabilidad.service');
const rutasJornadaQr = require('./routes/jornadaQr.routes');

const LIMITE_CUERPO = '10kb';

/**
 * Construye la aplicación Express SIN ponerla a escuchar (eso lo hace server.js).
 * Recibir la configuración como parámetro permite probarla con Supertest,
 * sin abrir un puerto y con cualquier conjunto de llaves u origen.
 *
 * @param {{ apiKeys: { postman: string, admin: string, movil: string, web: string }, origenPermitido: string, entornoDespliegue?: string }} configuracion
 */
const crearApp = ({ apiKeys, origenPermitido, entornoDespliegue = 'desarrollo' } = env) => {
  const app = express();
  app.locals.entornoDespliegue = entornoDespliegue;

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

  // Trazabilidad: X-Request-Id, X-Response-Time y tiempos por ruta de todo /api.
  app.use('/api', crearMiddlewareTrazabilidad(registroTrazabilidad));

  app.use(cors({ origin: origenPermitido, exposedHeaders: ['X-Request-Id', 'X-Response-Time'] }));
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
  // Antes de /api/jornadas: /qr no debe caer en las rutas /:id de jornadas.
  app.use('/api/jornadas/qr', rutasJornadaQr);
  app.use('/api/jornadas', rutasJornadas);
  app.use('/api/parametros', rutasParametros);
  app.use('/api/credito', rutasCredito);
  app.use('/api/caja', rutasCaja);
  app.use('/api/usuarios', rutasUsuarios);
  app.use('/api/reportes', rutasReportes);
  app.use('/api/nomina', rutasNomina);
  app.use('/api/inventario', rutasInventario);
  app.use('/api/trazabilidad', rutasTrazabilidad);

  app.use(rutaNoEncontrada);
  app.use(manejarErrores);

  return app;
};

module.exports = { crearApp };
