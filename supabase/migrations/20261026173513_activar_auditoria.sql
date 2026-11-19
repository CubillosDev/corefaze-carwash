-- Conecta la auditoría a todas las tablas de negocio. Va al final porque
-- necesita que todas existan. auditoria NO lleva este trigger (evita recursión).

create function public.registrar_auditoria()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_columnas_tecnicas constant text[] := array['actualizado_en', 'intentos_fallidos', 'bloqueado_hasta'];
  v_texto text;
  v_usuario_id bigint;
  v_anterior jsonb;
  v_nuevo jsonb;
  v_accion text;
begin
  v_texto := coalesce(
    nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-usuario-id',
    nullif(current_setting('app.usuario_id', true), '')
  );
  if v_texto ~ '^[0-9]{1,18}$' then
    v_usuario_id := v_texto::bigint;
  end if;

  if tg_op = 'INSERT' then
    v_accion := 'crear';
    v_nuevo := to_jsonb(new);
  elsif tg_op = 'DELETE' then
    v_accion := 'eliminar';
    v_anterior := to_jsonb(old);
  else
    v_anterior := to_jsonb(old);
    v_nuevo := to_jsonb(new);
    if (v_anterior - c_columnas_tecnicas) = (v_nuevo - c_columnas_tecnicas) then
      return null;
    end if;
    if tg_table_name = 'ordenes_lavado'
       and v_nuevo ->> 'estado' = 'cancelada'
       and v_anterior ->> 'estado' is distinct from 'cancelada' then
      v_accion := 'anular';
    else
      v_accion := 'editar';
    end if;
  end if;

  if tg_table_name = 'usuarios' then
    v_anterior := v_anterior - 'password_hash';
    v_nuevo := v_nuevo - 'password_hash';
  end if;

  insert into public.auditoria (usuario_id, tabla, registro_id, accion, valor_anterior, valor_nuevo)
  values (
    v_usuario_id,
    tg_table_name,
    (coalesce(v_nuevo, v_anterior) ->> 'id')::bigint,
    v_accion,
    v_anterior,
    v_nuevo
  );

  return null;
end;
$$;

comment on function public.registrar_auditoria() is
  'Usuario: header x-usuario-id (PostgREST) o app.usuario_id (pruebas/SQL). Ignora cambios solo en columnas técnicas y nunca guarda password_hash.';

revoke execute on function public.registrar_auditoria() from public, anon, authenticated;

create trigger trg_usuarios_auditoria after insert or update or delete on public.usuarios
  for each row execute function public.registrar_auditoria();
create trigger trg_parametros_negocio_auditoria after insert or update or delete on public.parametros_negocio
  for each row execute function public.registrar_auditoria();
create trigger trg_colaboradores_auditoria after insert or update or delete on public.colaboradores
  for each row execute function public.registrar_auditoria();
create trigger trg_servicios_auditoria after insert or update or delete on public.servicios
  for each row execute function public.registrar_auditoria();
create trigger trg_tarifas_servicio_auditoria after insert or update or delete on public.tarifas_servicio
  for each row execute function public.registrar_auditoria();
create trigger trg_clientes_auditoria after insert or update or delete on public.clientes
  for each row execute function public.registrar_auditoria();
create trigger trg_vehiculos_auditoria after insert or update or delete on public.vehiculos
  for each row execute function public.registrar_auditoria();
create trigger trg_jornadas_auditoria after insert or update or delete on public.jornadas
  for each row execute function public.registrar_auditoria();
create trigger trg_reaperturas_jornada_auditoria after insert or update or delete on public.reaperturas_jornada
  for each row execute function public.registrar_auditoria();
create trigger trg_ordenes_lavado_auditoria after insert or update or delete on public.ordenes_lavado
  for each row execute function public.registrar_auditoria();
