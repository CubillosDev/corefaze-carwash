-- Nivel 1: depende de usuarios. Tabla de una sola fila.

create table public.parametros_negocio (
  id smallint not null default 1,
  nombre_negocio varchar(100) not null,
  nit varchar(15),
  direccion varchar(150),
  telefono varchar(10),
  porcentaje_comision numeric(5, 4) not null,
  comision_vigente_desde date not null default current_date,
  descontar_comision_diaria boolean not null default false,
  costo_arriendo integer not null default 0,
  costo_luz integer not null default 0,
  costo_agua integer not null default 0,
  costo_nomina_fija integer not null default 0,
  costo_depreciacion integer not null default 0,
  costo_insumos integer not null default 0,
  costo_variable_lavado integer not null default 0,
  precio_promedio_referencia integer not null default 0,
  tope_prestamo_colaborador integer not null default 0,
  dias_operacion_mes smallint not null default 30,
  actualizado_por bigint,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint parametros_negocio_pkey primary key (id),
  constraint parametros_negocio_actualizado_por_fkey foreign key (actualizado_por)
    references public.usuarios (id) on delete restrict,
  constraint parametros_negocio_fila_unica_check check (id = 1),
  constraint parametros_negocio_nombre_negocio_check check (char_length(btrim(nombre_negocio)) between 3 and 100),
  constraint parametros_negocio_telefono_check check (telefono is null or telefono ~ '^[0-9]{10}$'),
  constraint parametros_negocio_porcentaje_comision_check check (porcentaje_comision between 0 and 1),
  constraint parametros_negocio_dinero_check check (
    costo_arriendo >= 0 and costo_luz >= 0 and costo_agua >= 0 and costo_nomina_fija >= 0
    and costo_depreciacion >= 0 and costo_insumos >= 0 and costo_variable_lavado >= 0
    and precio_promedio_referencia >= 0 and tope_prestamo_colaborador >= 0
  ),
  constraint parametros_negocio_dias_operacion_mes_check check (dias_operacion_mes between 1 and 31)
);

create index idx_parametros_negocio_actualizado_por on public.parametros_negocio (actualizado_por);

comment on table public.parametros_negocio is
  'Una sola fila (id = 1), creada por esta migración: GET /api/parametros nunca da 404.';
comment on column public.parametros_negocio.descontar_comision_diaria is
  'SCRUM-40: por defecto la comisión NO se resta del efectivo diario (se paga por quincena).';

insert into public.parametros_negocio (nombre_negocio, porcentaje_comision) values ('Car Wash', 0.37);

create trigger trg_parametros_negocio_actualizado_en
  before update on public.parametros_negocio
  for each row execute function public.asignar_actualizado_en();

alter table public.parametros_negocio enable row level security;
revoke all on table public.parametros_negocio from anon, authenticated;
revoke insert, delete, truncate on table public.parametros_negocio from service_role;
