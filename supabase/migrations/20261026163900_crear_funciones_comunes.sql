-- Funciones reutilizables por varias tablas. No dependen de ninguna tabla.

create function public.asignar_actualizado_en()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

comment on function public.asignar_actualizado_en() is
  'Trigger BEFORE UPDATE: mantiene actualizado_en sin depender de la API.';

create function public.impedir_eliminacion()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '%', tg_argv[0] using errcode = 'restrict_violation';
end;
$$;

comment on function public.impedir_eliminacion() is
  'Trigger BEFORE DELETE genérico: rechaza la eliminación con el mensaje recibido como argumento (SQLSTATE 23001).';
