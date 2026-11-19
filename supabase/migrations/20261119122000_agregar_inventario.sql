-- ============================================================
-- Inventario de insumos del lavadero (diseño del panel, módulo Inventario;
-- ver ADR 0007). Cada insumo lleva su stock y su mínimo; el stock cambia
-- solo con movimientos (entradas y salidas), que quedan registrados.
-- ============================================================

create table public.insumos (
  id bigint generated always as identity,
  nombre varchar(100) not null,
  categoria varchar(50) not null,
  unidad varchar(30) not null,
  stock integer not null default 0,
  stock_minimo integer not null default 0,
  estado text not null default 'activo',
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint insumos_pkey primary key (id),
  constraint insumos_nombre_check check (char_length(btrim(nombre)) between 3 and 100),
  constraint insumos_categoria_check check (char_length(btrim(categoria)) between 2 and 50),
  constraint insumos_unidad_check check (char_length(btrim(unidad)) between 1 and 30),
  constraint insumos_stock_check check (stock between 0 and 1000000),
  constraint insumos_stock_minimo_check check (stock_minimo between 0 and 1000000),
  constraint insumos_estado_check check (estado in ('activo', 'inactivo'))
);

create unique index idx_insumos_nombre on public.insumos (lower(btrim(nombre)));

comment on table public.insumos is 'Insumos del lavadero con su stock actual y el mínimo que dispara el aviso de stock bajo.';
comment on column public.insumos.stock is 'Lo cambia solo registrar_movimiento_inventario(), que deja el movimiento registrado.';

create trigger trg_insumos_actualizado_en
  before update on public.insumos
  for each row execute function public.asignar_actualizado_en();

create trigger trg_insumos_sin_eliminar
  before delete on public.insumos
  for each row execute function public.impedir_eliminacion('Un insumo no se elimina: se desactiva');

create trigger trg_insumos_auditoria
  after insert or update or delete on public.insumos
  for each row execute function public.registrar_auditoria();

create table public.movimientos_inventario (
  id bigint generated always as identity,
  insumo_id bigint not null,
  cantidad integer not null,
  stock_resultante integer not null,
  observacion varchar(255),
  registrado_por bigint not null,
  creado_en timestamptz not null default now(),
  constraint movimientos_inventario_pkey primary key (id),
  constraint movimientos_inventario_insumo_id_fkey foreign key (insumo_id)
    references public.insumos (id) on delete restrict,
  constraint movimientos_inventario_registrado_por_fkey foreign key (registrado_por)
    references public.usuarios (id) on delete restrict,
  constraint movimientos_inventario_cantidad_check check (cantidad <> 0 and cantidad between -100000 and 100000),
  constraint movimientos_inventario_stock_resultante_check check (stock_resultante >= 0)
);

create index idx_movimientos_inventario_insumo_id on public.movimientos_inventario (insumo_id);
create index idx_movimientos_inventario_registrado_por on public.movimientos_inventario (registrado_por);

comment on table public.movimientos_inventario is
  'Entradas (cantidad positiva) y salidas (negativa) de cada insumo, con el stock que dejó. Inmutable.';

create trigger trg_movimientos_inventario_sin_modificar
  before update on public.movimientos_inventario
  for each row execute function public.impedir_modificacion('Un movimiento de inventario no se modifica');

create trigger trg_movimientos_inventario_sin_eliminar
  before delete on public.movimientos_inventario
  for each row execute function public.impedir_eliminacion('Un movimiento de inventario no se elimina');

create trigger trg_movimientos_inventario_auditoria
  after insert or update or delete on public.movimientos_inventario
  for each row execute function public.registrar_auditoria();

alter table public.insumos enable row level security;
alter table public.movimientos_inventario enable row level security;
revoke all on table public.insumos, public.movimientos_inventario from anon, authenticated;
grant select on public.insumos, public.movimientos_inventario to authenticated;

create policy insumos_select_superadmin_administrador_soporte
  on public.insumos for select to authenticated
  using ((select public.rol_actual()) = any (array['superadmin', 'administrador', 'soporte']));
create policy movimientos_inventario_select_superadmin_administrador_soporte
  on public.movimientos_inventario for select to authenticated
  using ((select public.rol_actual()) = any (array['superadmin', 'administrador', 'soporte']));

-- Suma (o resta) unidades a un insumo activo y deja el movimiento. El stock
-- nunca queda negativo.
create function public.registrar_movimiento_inventario(
  p_insumo_id bigint,
  p_cantidad integer,
  p_observacion varchar(255),
  p_usuario_id bigint
)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_insumo public.insumos;
  v_nuevo integer;
begin
  select * into v_insumo from public.insumos where id = p_insumo_id for update;
  if not found then
    raise exception 'El insumo % no existe', p_insumo_id using errcode = 'no_data_found';
  end if;

  if v_insumo.estado <> 'activo' then
    raise exception 'Un insumo inactivo no recibe movimientos' using errcode = 'check_violation';
  end if;

  v_nuevo := v_insumo.stock + p_cantidad;
  if v_nuevo < 0 then
    raise exception 'El stock de % no puede quedar en negativo', v_insumo.nombre using errcode = 'check_violation';
  end if;

  update public.insumos set stock = v_nuevo where id = p_insumo_id;

  insert into public.movimientos_inventario (insumo_id, cantidad, stock_resultante, observacion, registrado_por)
  values (p_insumo_id, p_cantidad, v_nuevo, nullif(btrim(p_observacion), ''), p_usuario_id);

  return v_nuevo;
end;
$$;

comment on function public.registrar_movimiento_inventario(bigint, integer, varchar, bigint) is
  'Todo o nada: ajusta el stock de un insumo activo (sin quedar en negativo) y registra el movimiento.';

revoke execute on function public.registrar_movimiento_inventario(bigint, integer, varchar, bigint)
  from public, anon, authenticated;
grant execute on function public.registrar_movimiento_inventario(bigint, integer, varchar, bigint) to service_role;
