-- Comportamiento de ordenes_lavado, separado de la estructura para poder
-- corregirlo con "create or replace function" sin tocar la tabla.

create function public.preparar_orden_lavado()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_porcentaje numeric(5, 4);
begin
  select c.porcentaje_comision into v_porcentaje
  from public.colaboradores c
  where c.id = new.colaborador_id;

  if not found then
    raise exception 'El colaborador % no existe', new.colaborador_id
      using errcode = 'foreign_key_violation';
  end if;

  new.porcentaje_comision := v_porcentaje;
  return new;
end;
$$;

create function public.proteger_orden_lavado()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_porcentaje numeric(5, 4);
begin
  if old.estado in ('entregada', 'cancelada') then
    raise exception 'Una orden entregada o cancelada no se modifica'
      using errcode = 'check_violation';
  end if;

  if new.valor <> old.valor
     or new.servicio_id <> old.servicio_id
     or new.jornada_id <> old.jornada_id
     or new.fecha <> old.fecha
     or new.turno <> old.turno
     or new.creado_en <> old.creado_en then
    raise exception 'valor, servicio, jornada, fecha, turno y creado_en de una orden no se modifican'
      using errcode = 'check_violation';
  end if;

  if new.colaborador_id <> old.colaborador_id then
    select c.porcentaje_comision into v_porcentaje
    from public.colaboradores c
    where c.id = new.colaborador_id;

    if not found then
      raise exception 'El colaborador % no existe', new.colaborador_id
        using errcode = 'foreign_key_violation';
    end if;

    new.porcentaje_comision := v_porcentaje;
  elsif new.porcentaje_comision <> old.porcentaje_comision then
    raise exception 'El porcentaje de comisión de una orden no se modifica'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger trg_ordenes_lavado_preparar
  before insert on public.ordenes_lavado
  for each row execute function public.preparar_orden_lavado();

create trigger trg_ordenes_lavado_proteger
  before update on public.ordenes_lavado
  for each row execute function public.proteger_orden_lavado();

create trigger trg_ordenes_lavado_impedir_eliminar
  before delete on public.ordenes_lavado
  for each row execute function public.impedir_eliminacion('Las órdenes de lavado no se eliminan; se cancelan con motivo');
