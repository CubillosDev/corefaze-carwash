-- Nivel 0: no depende de ninguna tabla.

create table public.servicios (
  id bigint generated always as identity,
  numero smallint not null,
  nombre varchar(100) not null,
  descripcion varchar(255),
  categoria varchar(100),
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint servicios_pkey primary key (id),
  constraint servicios_numero_key unique (numero),
  constraint servicios_numero_check check (numero >= 1),
  constraint servicios_nombre_check check (char_length(btrim(nombre)) between 3 and 100),
  constraint servicios_categoria_check check (categoria is null or char_length(btrim(categoria)) between 3 and 100)
);

comment on column public.servicios.numero is 'Número del catálogo de precios; lo usan reglas como serviciosConLavadoMotor. Distinto del id.';

create trigger trg_servicios_actualizado_en
  before update on public.servicios
  for each row execute function public.asignar_actualizado_en();

alter table public.servicios enable row level security;
revoke all on table public.servicios from anon, authenticated;
