-- ═══════════════════════════════════════════════════════════════
-- AI QUOTA — el fusible de las funciones que gastan tokens
--
-- Content Lab llama a Claude una vez por clic y NO se cachea (a
-- diferencia de Inspire, que comparte una sola corrida cada 6h entre
-- todos). Medido con los prompts reales: $0.00156 por idea. A uso
-- normal es ruido, ~5% del MRR en el peor escenario.
--
-- El riesgo no es el productor entusiasta, es que alguien saque su
-- token de sesion y use el endpoint como API barata de Claude. Ahi
-- no hay techo natural. 30 al dia queda tan por encima del uso real
-- (el usuario intenso hace ~10) que nadie legitimo lo toca, y tapa
-- ese escenario (Paco 2026-08-02).
--
-- La cuenta la lleva el SERVIDOR, nunca el cliente: si el navegador
-- pudiera escribir aqui, reiniciar su propio contador seria trivial.
-- Por eso la tabla no tiene grants para anon/authenticated y solo la
-- toca service_role desde /api/lab-idea.
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  -- 'feature' para que el siguiente consumidor de tokens no necesite
  -- otra tabla: basta con otro literal.
  feature text not null,
  day     date not null default current_date,
  used    integer not null default 0,
  primary key (user_id, feature, day)
);

-- Barrer lo viejo es barato y mantiene la tabla plana.
create index if not exists ai_usage_day_idx on public.ai_usage (day);

alter table public.ai_usage enable row level security;

-- Sin policies A PROPOSITO. service_role ignora RLS, y es el unico que
-- entra aqui. Si algun dia queremos un medidor de cuota en la UI, lo
-- correcto es un GRANT SELECT por columna + policy de user_id = auth.uid(),
-- nunca UPDATE.
revoke all on public.ai_usage from anon, authenticated;

-- Explicito y no por herencia. Justo hoy nos mordio dar por hecho que un
-- privilegio se hereda cuando en realidad estaba definido por columna
-- (ver 20260703_security_rls.sql y la foto del estudio, 2026-08-02).
grant all on public.ai_usage to service_role;


-- ── Consumir un uso, de forma atomica ──────────────────────────────
--
-- Leer y despues escribir abre una ventana de carrera: dos peticiones
-- simultaneas leen 29 y las dos pasan. Aqui el INSERT ... ON CONFLICT
-- resuelve en UNA sola sentencia, asi que el limite se respeta aunque
-- lleguen veinte peticiones a la vez.
--
-- Devuelve el nuevo contador, o NULL si la cuota ya estaba agotada
-- (el WHERE del DO UPDATE no se cumple, no se actualiza fila, y el
-- RETURNING no devuelve nada).
--
-- SECURITY DEFINER a proposito. La tabla tiene RLS activo y CERO policies, asi
-- que sin esto la funcion solo sirve si quien llama trae BYPASSRLS. El
-- service_role de Supabase lo trae, pero depender de un atributo del rol es una
-- suposicion invisible, del mismo tipo que la que rompio la foto del estudio
-- hoy. Corriendo como el dueño de la tabla, funciona sin importar quien llame,
-- y quien puede llamar sigue estando controlado por el GRANT EXECUTE de abajo.
-- search_path fijo porque es la practica obligada en SECURITY DEFINER.
create or replace function public.consume_ai_quota(
  p_user    uuid,
  p_feature text,
  p_limit   integer
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_used integer;
begin
  insert into public.ai_usage as u (user_id, feature, day, used)
  values (p_user, p_feature, current_date, 1)
  on conflict (user_id, feature, day) do update
    set used = u.used + 1
    where u.used < p_limit
  returning u.used into v_used;

  return v_used;
end;
$$;


-- ── Devolver un uso ────────────────────────────────────────────────
--
-- Si Claude falla, el usuario no gasto nada nuestro y no es justo que
-- pierda un turno. Reservar antes de llamar y devolver si truena
-- protege el presupuesto sin castigar al usuario por un error nuestro.
create or replace function public.refund_ai_quota(
  p_user    uuid,
  p_feature text
)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.ai_usage
     set used = greatest(used - 1, 0)
   where user_id = p_user
     and feature = p_feature
     and day     = current_date;
$$;

-- Ninguna de las dos es invocable desde el navegador.
revoke execute on function public.consume_ai_quota(uuid, text, integer) from public, anon, authenticated;
revoke execute on function public.refund_ai_quota(uuid, text) from public, anon, authenticated;
grant  execute on function public.consume_ai_quota(uuid, text, integer) to service_role;
grant  execute on function public.refund_ai_quota(uuid, text) to service_role;
