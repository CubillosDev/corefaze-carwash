-- Nivel 1: depende de usuarios.

create table public.jornadas (
  id bigint generated always as identity,
  fecha date not null,
  estado text not null default 'abierta',
  abierta_en timestamptz not null default now(),
  abierta_por bigint,
  cerrada_en timestamptz,
  cerrada_por bigint,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint jornadas_pkey primary key (id),
  constraint jornadas_fecha_key unique (fecha),
  constraint jornadas_id_fecha_key unique (id, fecha),
  constraint jornadas_abierta_por_fkey foreign key (abierta_por)
    references public.usuarios (id) on delete restrict,
  constraint jornadas_cerrada_por_fkey foreign key (cerrada_por)
    references public.usuarios (id) on delete restrict,
  constraint jornadas_estado_check check (estado in ('abierta', 'cerrada')),
  constraint jornadas_cierre_check check (estado = 'abierta' or cerrada_en is not null)
);

create unique index idx_jornadas_una_abierta on public.jornadas ((true)) where estado = 'abierta';
create index idx_jornadas_abierta_por on public.jornadas (abierta_por);
create index idx_jornadas_cerrada_por on public.jornadas (cerrada_por);

comment on constraint jornadas_id_fecha_key on public.jornadas is
  'Permite la FK compuesta (jornada_id, fecha) desde ordenes_lavado: la fecha de una orden siempre es la de su jornada.';
comment on index public.idx_jornadas_una_abierta is 'Solo puede haber una jornada abierta en todo el sistema.';

create trigger trg_jornadas_actualizado_en
  before update on public.jornadas
  for each row execute function public.asignar_actualizado_en();

alter table public.jornadas enable row level security;
revoke all on table public.jornadas from anon, authenticated;
