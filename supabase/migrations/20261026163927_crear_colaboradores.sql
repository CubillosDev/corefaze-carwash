-- Nivel 0: no depende de ninguna tabla.

create table public.colaboradores (
  id bigint generated always as identity,
  codigo smallint not null,
  nombre varchar(100) not null,
  documento varchar(15) not null,
  telefono varchar(10) not null,
  porcentaje_comision numeric(5, 4) not null,
  tipo_vinculacion text not null,
  estado text not null default 'activo',
  inactivo_desde timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint colaboradores_pkey primary key (id),
  constraint colaboradores_documento_key unique (documento),
  constraint colaboradores_codigo_check check (codigo between 100 and 999),
  constraint colaboradores_nombre_check check (char_length(btrim(nombre)) between 3 and 100),
  constraint colaboradores_documento_check check (char_length(btrim(documento)) between 6 and 15),
  constraint colaboradores_telefono_check check (telefono ~ '^[0-9]{10}$'),
  constraint colaboradores_porcentaje_comision_check check (porcentaje_comision between 0 and 1),
  constraint colaboradores_tipo_vinculacion_check check (tipo_vinculacion in ('fijo', 'ocasional')),
  constraint colaboradores_estado_check check (estado in ('activo', 'inactivo')),
  constraint colaboradores_inactivo_desde_check check ((estado = 'activo') = (inactivo_desde is null))
);

create unique index idx_colaboradores_codigo_activo
  on public.colaboradores (codigo)
  where estado = 'activo';

comment on index public.idx_colaboradores_codigo_activo is
  'El código es único solo entre activos: se reasigna tras 15 días de gracia (diasGraciaCodigoColaborador). La gracia depende de now() y la valida la API.';

create trigger trg_colaboradores_actualizado_en
  before update on public.colaboradores
  for each row execute function public.asignar_actualizado_en();

alter table public.colaboradores enable row level security;
revoke all on table public.colaboradores from anon, authenticated;
