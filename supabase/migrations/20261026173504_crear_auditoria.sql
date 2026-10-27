-- Nivel 1: depende de usuarios. Registro de solo inserción e inmutable.

create table public.auditoria (
  id bigint generated always as identity,
  usuario_id bigint,
  tabla text not null,
  registro_id bigint not null,
  accion text not null,
  valor_anterior jsonb,
  valor_nuevo jsonb,
  creado_en timestamptz not null default now(),
  constraint auditoria_pkey primary key (id),
  constraint auditoria_usuario_id_fkey foreign key (usuario_id)
    references public.usuarios (id) on delete restrict,
  constraint auditoria_accion_check check (accion in ('crear', 'editar', 'anular', 'eliminar')),
  constraint auditoria_valores_check check (
    (accion = 'crear' and valor_anterior is null and valor_nuevo is not null)
    or (accion = 'eliminar' and valor_anterior is not null and valor_nuevo is null)
    or (accion in ('editar', 'anular') and valor_anterior is not null and valor_nuevo is not null)
  )
);

create index idx_auditoria_tabla_registro_id on public.auditoria (tabla, registro_id);
create index idx_auditoria_usuario_id on public.auditoria (usuario_id);
create index idx_auditoria_creado_en on public.auditoria (creado_en desc);

create function public.impedir_cambios_auditoria()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    raise exception 'La auditoría no se modifica' using errcode = 'check_violation';
  end if;
  raise exception 'La auditoría no se elimina' using errcode = 'restrict_violation';
end;
$$;

create trigger trg_auditoria_inmutable
  before update or delete on public.auditoria
  for each row execute function public.impedir_cambios_auditoria();

create trigger trg_auditoria_sin_truncate
  before truncate on public.auditoria
  for each statement execute function public.impedir_cambios_auditoria();

comment on table public.auditoria is
  'Quién cambió qué y cuándo (SCRUM-26). Solo la escribe registrar_auditoria(); nadie la edita ni la borra.';

alter table public.auditoria enable row level security;
revoke all on table public.auditoria from anon, authenticated;
revoke insert, update, delete, truncate on table public.auditoria from service_role;
