-- Nivel 0: no depende de ninguna tabla.

create table public.clientes (
  id bigint generated always as identity,
  nombre varchar(100) not null,
  documento varchar(15) not null,
  tipo text not null,
  telefono varchar(10) not null,
  email varchar(254),
  credito_habilitado boolean not null default false,
  estado text not null default 'activo',
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint clientes_pkey primary key (id),
  constraint clientes_documento_key unique (documento),
  constraint clientes_nombre_check check (char_length(btrim(nombre)) between 3 and 100),
  constraint clientes_documento_check check (char_length(btrim(documento)) between 6 and 15),
  constraint clientes_tipo_check check (tipo in ('particular', 'empresa')),
  constraint clientes_telefono_check check (telefono ~ '^[0-9]{10}$'),
  constraint clientes_email_check check (email is null or (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  constraint clientes_estado_check check (estado in ('activo', 'inactivo')),
  constraint clientes_credito_solo_empresa_check check (not credito_habilitado or tipo = 'empresa')
);

create trigger trg_clientes_actualizado_en
  before update on public.clientes
  for each row execute function public.asignar_actualizado_en();

alter table public.clientes enable row level security;
revoke all on table public.clientes from anon, authenticated;
