-- ============================================================
-- Apertura de la jornada con QR (diseño del panel: panel de jornada del
-- tablero; ver ADR 0007). El panel muestra un QR con un token de un solo
-- uso que vence en segundos; la app móvil lo lee con la sesión de quien
-- abre la jornada y la API la abre. Solo se guarda el hash del token.
-- ============================================================

create table public.tokens_jornada (
  id bigint generated always as identity,
  token_hash char(64) not null,
  creado_por bigint not null,
  expira_en timestamptz not null,
  usado_en timestamptz,
  usado_por bigint,
  jornada_id bigint,
  creado_en timestamptz not null default now(),
  constraint tokens_jornada_pkey primary key (id),
  constraint tokens_jornada_token_hash_key unique (token_hash),
  constraint tokens_jornada_creado_por_fkey foreign key (creado_por)
    references public.usuarios (id) on delete restrict,
  constraint tokens_jornada_usado_por_fkey foreign key (usado_por)
    references public.usuarios (id) on delete restrict,
  constraint tokens_jornada_jornada_id_fkey foreign key (jornada_id)
    references public.jornadas (id) on delete restrict,
  constraint tokens_jornada_token_hash_check check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint tokens_jornada_vigencia_check check (expira_en > creado_en),
  constraint tokens_jornada_uso_check check ((usado_en is null) = (usado_por is null))
);

create index idx_tokens_jornada_creado_por on public.tokens_jornada (creado_por);
create index idx_tokens_jornada_usado_por on public.tokens_jornada (usado_por);
create index idx_tokens_jornada_jornada_id on public.tokens_jornada (jornada_id);

comment on table public.tokens_jornada is
  'Tokens de un solo uso del QR para abrir la jornada desde la app móvil. Se guarda el SHA-256, nunca el token.';

create trigger trg_tokens_jornada_sin_eliminar
  before delete on public.tokens_jornada
  for each row execute function public.impedir_eliminacion('Un token de jornada no se elimina');

create trigger trg_tokens_jornada_auditoria
  after insert or update or delete on public.tokens_jornada
  for each row execute function public.registrar_auditoria();

-- Ningún rol de la aplicación los consulta: solo la API (service_role).
alter table public.tokens_jornada enable row level security;
revoke all on table public.tokens_jornada from anon, authenticated;
