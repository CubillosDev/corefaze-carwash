const { supabase } = require('../db/supabaseCliente');
const { generarPasswordHash } = require('../utils/password.util');
const { env } = require('../config/env');

/**
 * Bootstrap del primer "superadmin" (RBAC, Bloque 6), ahora contra la
 * base real (SCRUM-152) en vez del array en memoria: reemplaza al
 * bootstrap que antes corría solo con levantar el servidor (ver
 * server.js antes de SCRUM-152) por un script explícito,
 * `npm run seed:superadmin`.
 *
 * No hay otra forma de arrancar RBAC sin una cuenta con privilegios ya
 * creada: el registro público siempre nace "pendiente" y asignar un rol
 * requiere YA ser superadmin.
 */
const crearSuperAdmin = async () => {
  if (!env.superadmin) {
    throw new Error('No hay credenciales SUPERADMIN_* configuradas');
  }

  const { data: existentes, error: errorConsulta } = await supabase
    .from('usuarios')
    .select('id')
    .eq('rol', 'superadmin')
    .limit(1);

  if (errorConsulta) {
    throw new Error(`No se pudo consultar la tabla usuarios: ${errorConsulta.message}`);
  }

  if (existentes.length > 0) {
    // eslint-disable-next-line no-console
    console.log('Ya existe un superadmin, no se modificó nada');
    return;
  }

  const passwordHash = await generarPasswordHash(env.superadmin.password);

  const { data: creado, error: errorInsercion } = await supabase
    .from('usuarios')
    .insert({
      nombre: env.superadmin.nombre,
      email: env.superadmin.email.toLowerCase(),
      password_hash: passwordHash,
      rol: 'superadmin',
      activo: true,
    })
    .select('id')
    .single();

  if (errorInsercion) {
    throw new Error(`No se pudo crear el superadmin: ${errorInsercion.message}`);
  }

  // eslint-disable-next-line no-console
  console.log(`Superadmin inicial creado: id ${creado.id}`);
};

crearSuperAdmin().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error.message);
  process.exitCode = 1;
});
