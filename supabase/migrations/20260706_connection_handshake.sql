-- ═══ Fennec Network · dynamic handshake ═══
-- A ~60s token turns "scan me" into a mutual, un-fakeable exchange.

create table if not exists public.connection_tokens (
  token       uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '60 seconds',
  redeemed    boolean not null default false
);
alter table public.connection_tokens enable row level security;
-- No direct client access; everything goes through the definer RPCs below.

-- Mint: caller creates a short-lived token for themselves.
create or replace function public.mint_connection_token()
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_token uuid;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  insert into connection_tokens (user_id) values (auth.uid())
  returning token into v_token;
  return v_token;
end;
$$;
grant execute on function public.mint_connection_token() to authenticated;

-- Redeem: the scanner burns the token and both cards enter both decks.
create or replace function public.redeem_connection_token(p_token uuid)
returns json
language plpgsql security definer set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_owner  uuid;
  v_tok    record;
  v_profile json;
begin
  if v_caller is null then raise exception 'UNAUTHENTICATED'; end if;

  select * into v_tok from connection_tokens where token = p_token for update;
  if not found then raise exception 'TOKEN_NOT_FOUND'; end if;
  if v_tok.redeemed then raise exception 'TOKEN_USED'; end if;
  if v_tok.expires_at < now() then raise exception 'TOKEN_EXPIRED'; end if;

  v_owner := v_tok.user_id;
  if v_owner = v_caller then raise exception 'CANNOT_CONNECT_SELF'; end if;

  update connection_tokens set redeemed = true where token = p_token;

  -- both directions, idempotent
  insert into network_connections (owner_id, contact_id)
    values (v_caller, v_owner) on conflict (owner_id, contact_id) do nothing;
  insert into network_connections (owner_id, contact_id)
    values (v_owner, v_caller) on conflict (owner_id, contact_id) do nothing;

  select json_build_object(
    'id', id, 'username', username, 'display_name', display_name,
    'avatar_url', avatar_url, 'role', role, 'color_id', color_id,
    'fennec_number', fennec_number, 'fennec_db_score', fennec_db_score
  ) into v_profile from profiles where id = v_owner;

  return json_build_object('ok', true, 'peer', v_profile);
end;
$$;
grant execute on function public.redeem_connection_token(uuid) to authenticated;
