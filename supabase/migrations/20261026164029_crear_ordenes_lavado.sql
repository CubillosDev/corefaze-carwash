-- Nivel 3: depende de jornadas, vehiculos, servicios, colaboradores y clientes.

create table public.ordenes_lavado (
  id bigint generated always as identity,
  jornada_id bigint not null,
  fecha date not null,
  turno integer not null,
  vehiculo_id bigint not null,
  servicio_id bigint not null,
  colaborador_id bigint not null,
  cliente_id bigint,
  valor integer not null,
  porcentaje_comision numeric(5, 4) not null,
  medio_pago text not null,
  autoriza_motor boolean not null default false,
  observaciones varchar(255),
  motivo varchar(255),
  estado text not null default 'registrada',
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint ordenes_lavado_pkey primary key (id),
  constraint ordenes_lavado_fecha_turno_key unique (fecha, turno),
  constraint ordenes_lavado_jornada_fkey foreign key (jornada_id, fecha)
    references public.jornadas (id, fecha) on delete restrict,
  constraint ordenes_lavado_vehiculo_id_fkey foreign key (vehiculo_id)
    references public.vehiculos (id) on delete restrict,
  constraint ordenes_lavado_servicio_id_fkey foreign key (servicio_id)
    references public.servicios (id) on delete restrict,
  constraint ordenes_lavado_colaborador_id_fkey foreign key (colaborador_id)
    references public.colaboradores (id) on delete restrict,
  constraint ordenes_lavado_cliente_id_fkey foreign key (cliente_id)
    references public.clientes (id) on delete restrict,
  constraint ordenes_lavado_turno_check check (turno >= 1),
  constraint ordenes_lavado_valor_check check (valor > 0 and valor <= 1000000),
  constraint ordenes_lavado_porcentaje_comision_check check (porcentaje_comision between 0 and 1),
  constraint ordenes_lavado_medio_pago_check check (
    medio_pago in ('efectivo', 'nequi', 'daviplata', 'bancolombia', 'datafono', 'credito')
  ),
  constraint ordenes_lavado_estado_check check (
    estado in ('registrada', 'en_proceso', 'terminada', 'entregada', 'cancelada')
  ),
  constraint ordenes_lavado_credito_cliente_check check ((medio_pago = 'credito') = (cliente_id is not null)),
  constraint ordenes_lavado_motivo_cancelacion_check check (
    (estado = 'cancelada') = (motivo is not null and btrim(motivo) <> '')
  )
);

create unique index idx_ordenes_lavado_vehiculo_abierta
  on public.ordenes_lavado (vehiculo_id)
  where estado in ('registrada', 'en_proceso');
create index idx_ordenes_lavado_jornada_id_fecha on public.ordenes_lavado (jornada_id, fecha);
create index idx_ordenes_lavado_vehiculo_id on public.ordenes_lavado (vehiculo_id);
create index idx_ordenes_lavado_servicio_id on public.ordenes_lavado (servicio_id);
create index idx_ordenes_lavado_colaborador_id on public.ordenes_lavado (colaborador_id);
create index idx_ordenes_lavado_cliente_id on public.ordenes_lavado (cliente_id) where cliente_id is not null;

comment on column public.ordenes_lavado.valor is 'R4: lo fija la API con la tarifa vigente y queda congelado.';
comment on column public.ordenes_lavado.porcentaje_comision is
  'Copia congelada del % del colaborador al crear la orden: cambiar el % solo afecta liquidaciones futuras.';
comment on column public.ordenes_lavado.cliente_id is 'Quién paga a crédito (R8); puede ser distinto del dueño del vehículo.';
comment on index public.idx_ordenes_lavado_vehiculo_abierta is 'R6: una sola orden abierta por vehículo.';

create trigger trg_ordenes_lavado_actualizado_en
  before update on public.ordenes_lavado
  for each row execute function public.asignar_actualizado_en();

alter table public.ordenes_lavado enable row level security;
revoke all on table public.ordenes_lavado from anon, authenticated;
