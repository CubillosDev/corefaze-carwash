const { createClient } = require('@supabase/supabase-js');
const { env } = require('../config/env');

const OPCIONES_BASE = { auth: { persistSession: false } };

/**
 * Cliente único para lecturas y para escrituras en tablas que no se
 * auditan. Usa la service_role key: bypasea RLS por completo, así que
 * solo lo usan los services, nunca se expone al cliente HTTP.
 */
const supabase = createClient(env.supabase.url, env.supabase.serviceRoleKey, OPCIONES_BASE);

/**
 * Cliente aparte (no el singleton) para cada escritura (insert/update/delete)
 * sobre una tabla auditada. El header `x-usuario-id` es lo que
 * registrar_auditoria() lee en la BD para saber quién hizo el cambio (ver
 * supabase/migrations/..._activar_auditoria.sql) — nunca se usa
 * `set_config`, porque cada petición de supabase-js es su propia
 * transacción y ese valor no sobreviviría entre una llamada y otra.
 *
 * @param {number|string} usuarioId
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
const crearClienteConUsuario = (usuarioId) =>
  createClient(env.supabase.url, env.supabase.serviceRoleKey, {
    ...OPCIONES_BASE,
    global: { headers: { 'x-usuario-id': String(usuarioId) } },
  });

module.exports = { supabase, crearClienteConUsuario };
