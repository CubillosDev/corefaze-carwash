begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

-- ============================================================
-- Rol fuera del catálogo (23514)
-- ============================================================

select throws_ok(
  $$insert into public.usuarios (nombre, email, password_hash, rol)
    values ('Rol Invalido', 'rolinvalido2@carwash.test', '$2b$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0', 'dueno')$$,
  '23514',
  null,
  'un rol fuera del catálogo en usuarios falla con 23514'
);

-- ============================================================
-- parametros_negocio: fila única, y rangos de porcentaje y días
-- ============================================================

select throws_ok(
  $$insert into public.parametros_negocio (id, nombre_negocio, porcentaje_comision)
    values (2, 'Otro Negocio', 0.10)$$,
  '23514',
  null,
  'una segunda fila de parametros_negocio falla con 23514'
);

select throws_ok(
  $$update public.parametros_negocio set porcentaje_comision = 1.50 where id = 1$$,
  '23514',
  null,
  'porcentaje_comision fuera de 0-1 en parametros_negocio falla con 23514'
);

select throws_ok(
  $$update public.parametros_negocio set dias_operacion_mes = 32 where id = 1$$,
  '23514',
  null,
  'dias_operacion_mes fuera de 1-31 en parametros_negocio falla con 23514'
);

-- La fila la crea la migración 12 (insert con id=1), no el seed: el seed
-- de la Fase 2 solo hace un UPDATE sobre ella. parametros_negocio_fila_unica_check
-- (id = 1) además garantiza que nunca puede haber una segunda.
select is(
  (select count(*) from public.parametros_negocio)::int,
  1,
  'la fila de parametros_negocio existe (la crea la migración, no el seed)'
);

-- ============================================================
-- Permisos: service_role no puede borrar usuarios ni
-- insertar/borrar parametros_negocio (42501)
-- ============================================================

set local role service_role;

select throws_ok(
  $$delete from public.usuarios where id = 999999$$,
  '42501',
  null,
  'service_role no puede borrar usuarios'
);

select throws_ok(
  $$insert into public.parametros_negocio (id, nombre_negocio, porcentaje_comision)
    values (2, 'Otro Negocio', 0.10)$$,
  '42501',
  null,
  'service_role no puede insertar en parametros_negocio'
);

select throws_ok(
  $$delete from public.parametros_negocio where id = 1$$,
  '42501',
  null,
  'service_role no puede borrar parametros_negocio'
);

reset role;

select * from finish();
rollback;
