const { env } = require('./config/env');
const { crearApp } = require('./app');
const { crearSuperAdministradorInicial } = require('./services/usuarios.service');

const app = crearApp(env);

/**
 * Bootstrap opcional del primer "superadmin" (RBAC, Bloque 6).
 *
 * No hay otra forma de arrancar RBAC sin una cuenta con privilegios ya
 * creada: el registro público siempre nace "pendiente" (ver
 * usuarios.service.js) y asignar un rol requiere YA ser superadmin. Por
 * eso este bootstrap vive solo aquí (nunca en `crearApp`/los tests) y solo
 * se ejecuta si el entorno trae credenciales explícitas para ello.
 */
const arrancarSuperAdministradorInicial = async () => {
  const { SUPERADMIN_NOMBRE, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD } = process.env;

  if (!SUPERADMIN_EMAIL || !SUPERADMIN_PASSWORD) {
    return;
  }

  const creado = await crearSuperAdministradorInicial({
    nombre: SUPERADMIN_NOMBRE || 'Super Administrador',
    email: SUPERADMIN_EMAIL,
    password: SUPERADMIN_PASSWORD,
  });

  if (creado) {
    // eslint-disable-next-line no-console
    console.log(`Superadmin inicial creado: ${creado.email}`);
  }
};

arrancarSuperAdministradorInicial();

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
