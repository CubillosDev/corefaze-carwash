-- Nivel 0: no depende de ninguna tabla.

create table public.usuarios (
  id bigint generated always as identity,
  nombre varchar(100) not null,
  email varchar(254) not null,
  password_hash text not null,
  rol text not null default 'pendiente',
  activo boolean not null default true,
  intentos_fallidos smallint not null default 0,
  bloqueado_hasta timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint usuarios_pkey primary key (id),
  constraint usuarios_email_key unique (email),
  constraint usuarios_nombre_check check (char_length(btrim(nombre)) between 3 and 100),
  constraint usuarios_email_check check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint usuarios_password_hash_check check (password_hash ~ '^\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}$'),
  constraint usuarios_rol_check check (rol in ('superadmin', 'administrador', 'soporte', 'pendiente')),
  constraint usuarios_intentos_fallidos_check check (intentos_fallidos >= 0)
);

comment on table public.usuarios is 'Personas que inician sesión. Nunca se borran: se desactivan (activo = false).';
comment on column public.usuarios.password_hash is 'Hash bcrypt. El CHECK impide guardar contraseñas en texto plano.';

create trigger trg_usuarios_actualizado_en
  before update on public.usuarios
  for each row execute function public.asignar_actualizado_en();

alter table public.usuarios enable row level security;
revoke all on table public.usuarios from anon, authenticated;
revoke delete, truncate on table public.usuarios from service_role;
