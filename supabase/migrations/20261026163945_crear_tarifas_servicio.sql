-- Nivel 1: depende de servicios.

create table public.tarifas_servicio (
  id bigint generated always as identity,
  servicio_id bigint not null,
  tipo_vehiculo text not null,
  valor integer not null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint tarifas_servicio_pkey primary key (id),
  constraint tarifas_servicio_servicio_id_fkey foreign key (servicio_id)
    references public.servicios (id) on delete cascade,
  constraint tarifas_servicio_servicio_tipo_key unique (servicio_id, tipo_vehiculo),
  constraint tarifas_servicio_tipo_vehiculo_check check (
    tipo_vehiculo in ('automovil', 'camioneta', 'platon_7_pasajeros', 'moto_hasta_150cc', 'moto_desde_150cc')
  ),
  constraint tarifas_servicio_valor_check check (valor between 1000 and 1000000)
);

comment on constraint tarifas_servicio_servicio_id_fkey on public.tarifas_servicio is
  'Única FK en cascada: la tarifa es parte del servicio. Un servicio con órdenes sigue protegido por ordenes_lavado_servicio_id_fkey (RESTRICT).';

create trigger trg_tarifas_servicio_actualizado_en
  before update on public.tarifas_servicio
  for each row execute function public.asignar_actualizado_en();

alter table public.tarifas_servicio enable row level security;
revoke all on table public.tarifas_servicio from anon, authenticated;
