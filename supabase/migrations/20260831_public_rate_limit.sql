-- ═══════════════════════════════════════════════════════════════
-- RATE LIMIT PARA RUTAS PUBLICAS (2026-08-31)
--
-- Auditoria de seguridad del 2026-08-31: las rutas sin sesion no tenian
-- ningun freno. La mas abusable es /api/waitlist/welcome, que manda correo
-- con Resend: sin limite, cualquiera podia quemar la cuota o usarla para
-- spam. /api/waitlist/signup podia llenar la waitlist de basura.
--
-- Mismo criterio que ai_usage: el contador vive en el SERVIDOR (service_role)
-- porque uno que el navegador pueda escribir se reinicia solo. La diferencia
-- es la llave: aqui no hay usuario, asi que se cuenta por IP.
--
-- Vale tambien para el beacon del onboarding cuando exista (es publico por
-- definicion: mide a quien todavia NO tiene cuenta).
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.public_quota (
  -- "que:quien", p.ej. "waitlist_welcome:187.190.1.2"
  bucket       text not null,
  window_start timestamptz not null,
  count        integer not null default 0,
  primary key (bucket, window_start)
);

create index if not exists public_quota_window_idx on public.public_quota (window_start);

alter table public.public_quota enable row level security;
-- Sin policies A PROPOSITO: solo service_role entra, igual que ai_usage.
revoke all on public.public_quota from anon, authenticated;
grant all on public.public_quota to service_role;

-- ── Consumir un intento, atomico ───────────────────────────────────
-- Leer y luego escribir abre una carrera: dos peticiones simultaneas leen
-- el mismo valor y las dos pasan. El insert...on conflict do update lo
-- resuelve en una sola sentencia.
-- Devuelve true si el intento CABE dentro del limite.
create or replace function public.consume_public_quota(
  p_bucket text,
  p_limit  integer,
  p_window_minutes integer default 60
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secs  integer := greatest(p_window_minutes, 1) * 60;
  v_win   timestamptz := to_timestamp(floor(extract(epoch from now()) / v_secs) * v_secs);
  v_count integer;
begin
  insert into public_quota (bucket, window_start, count)
  values (p_bucket, v_win, 1)
  on conflict (bucket, window_start)
    do update set count = public_quota.count + 1
  returning count into v_count;

  -- Barrido barato: solo cuando se abre un bucket nuevo, no en cada peticion.
  if v_count = 1 then
    delete from public_quota where window_start < now() - interval '2 days';
  end if;

  return v_count <= greatest(p_limit, 1);
end;
$$;

revoke all on function public.consume_public_quota(text, integer, integer) from anon, authenticated;
grant execute on function public.consume_public_quota(text, integer, integer) to service_role;
