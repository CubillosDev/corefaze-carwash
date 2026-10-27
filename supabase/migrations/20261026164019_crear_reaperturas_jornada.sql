-- Nivel 2: depende de jornadas y usuarios. Registro de solo inserción.

create table public.reaperturas_jornada (
  id bigint generated always as identity,
  jornada_id bigint not null,
  reabierta_por bigint,
  creado_en timestamptz not null default now(),
  constraint reaperturas_jornada_pkey primary key (id),
  constraint reaperturas_jornada_jornada_id_fkey foreign key (jornada_id)
    references public.jornadas (id) on delete restrict,
  constraint reaperturas_jornada_reabierta_por_fkey foreign key (reabierta_por)
    references public.usuarios (id) on delete restrict
);

create index idx_reaperturas_jornada_jornada_id on public.reaperturas_jornada (jornada_id);
create index idx_reaperturas_jornada_reabierta_por on public.reaperturas_jornada (reabierta_por);

comment on table public.reaperturas_jornada is
  'Reemplaza el arreglo reaperturas de la API: una fila por cada vez que se reabre una jornada (creado_en = momento de la reapertura).';

alter table public.reaperturas_jornada enable row level security;
revoke all on table public.reaperturas_jornada from anon, authenticated;
revoke update, delete, truncate on table public.reaperturas_jornada from service_role;
