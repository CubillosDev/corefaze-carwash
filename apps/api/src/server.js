const { env } = require('./config/env');
const { crearApp } = require('./app');

const app = crearApp(env);

const servidor = app.listen(env.puerto, () => {
  // Único console.log permitido: avisa que el servidor arrancó
  // eslint-disable-next-line no-console
  console.log(`API Car Wash escuchando en el puerto ${env.puerto} (${env.entorno})`);
});

/**
 * Apagado ordenado: deja de aceptar conexiones nuevas y termina las que están
 * en curso antes de cerrar el proceso (Ctrl+C en local, o el aviso del servidor al desplegar).
 */
const apagar = () => {
  servidor.close(() => process.exit(0));
};

process.on('SIGINT', apagar);
process.on('SIGTERM', apagar);
