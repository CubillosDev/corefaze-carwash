-- Nivel 1: depende de servicios/tarifas_servicio.
--
-- Reemplaza el flujo "borra las tarifas, después inserta las nuevas" de
-- crearServicio/actualizarServicio (dos llamadas separadas a Supabase,
-- sin transacción real) por una sola función transaccional: si el INSERT
-- falla a mitad de camino (p. ej. tipo_vehiculo duplicado), Postgres
-- revierte también el DELETE, así el servicio nunca queda con 0 tarifas
-- por un fallo parcial (hallazgo del review del PR #12, SCRUM-152).

create function public.reemplazar_tarifas_servicio(p_servicio_id bigint, p_tarifas jsonb)
returns void
language plpgsql
set search_path = ''
as $$
begin
  delete from public.tarifas_servicio where servicio_id = p_servicio_id;

  insert into public.tarifas_servicio (servicio_id, tipo_vehiculo, valor)
  select
    p_servicio_id,
    tarifa ->> 'tipo_vehiculo',
    (tarifa ->> 'valor')::integer
  from jsonb_array_elements(p_tarifas) as tarifa;
end;
$$;

comment on function public.reemplazar_tarifas_servicio(bigint, jsonb) is
  'Todo o nada: borra las tarifas actuales del servicio e inserta las nuevas dentro de la misma transacción. Si el INSERT falla (p. ej. tipo_vehiculo duplicado por tarifas_servicio_servicio_tipo_key), Postgres revierte también el DELETE.';

revoke execute on function public.reemplazar_tarifas_servicio(bigint, jsonb) from anon, authenticated;
