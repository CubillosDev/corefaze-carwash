-- Nivel 1: depende de clientes.

create table public.vehiculos (
  id bigint generated always as identity,
  placa varchar(6) not null,
  tipo_vehiculo text not null,
  marca varchar(30),
  color varchar(30),
  cliente_id bigint not null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint vehiculos_pkey primary key (id),
  constraint vehiculos_placa_key unique (placa),
  constraint vehiculos_cliente_id_fkey foreign key (cliente_id)
    references public.clientes (id) on delete restrict,
  constraint vehiculos_tipo_vehiculo_check check (
    tipo_vehiculo in ('automovil', 'camioneta', 'platon_7_pasajeros', 'moto_hasta_150cc', 'moto_desde_150cc')
  ),
  constraint vehiculos_placa_tipo_check check (
    (tipo_vehiculo in ('moto_hasta_150cc', 'moto_desde_150cc') and placa ~ '^[A-Z]{3}[0-9]{2}[A-Z]$')
    or (tipo_vehiculo not in ('moto_hasta_150cc', 'moto_desde_150cc') and placa ~ '^[A-Z]{3}[0-9]{3}$')
  ),
  constraint vehiculos_marca_check check (marca is null or char_length(btrim(marca)) between 2 and 30),
  constraint vehiculos_color_check check (color is null or char_length(btrim(color)) between 2 and 30)
);

create index idx_vehiculos_cliente_id on public.vehiculos (cliente_id);

comment on column public.vehiculos.cliente_id is 'Obligatorio porque así lo exige vehiculos.validator.js (el estándar lo describe opcional).';

create trigger trg_vehiculos_actualizado_en
  before update on public.vehiculos
  for each row execute function public.asignar_actualizado_en();

alter table public.vehiculos enable row level security;
revoke all on table public.vehiculos from anon, authenticated;
