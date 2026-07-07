-- ═══ Fennec Network · global #number (immutable, order of joining) ═══
-- One number per producer, engraved on their card forever.

-- 1) Column
alter table public.profiles
  add column if not exists fennec_number integer;

-- 2) Backfill existing users by join order (created_at, then id as tiebreak)
with ordered as (
  select id, row_number() over (order by created_at asc, id asc) as n
  from public.profiles
)
update public.profiles p
set fennec_number = ordered.n
from ordered
where p.id = ordered.id and p.fennec_number is null;

-- 3) Uniqueness + fast lookup
create unique index if not exists profiles_fennec_number_key
  on public.profiles(fennec_number);

-- 4) Assign the next number on new-profile insert (immutable thereafter)
create or replace function public.fn_assign_fennec_number()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.fennec_number is null then
    select coalesce(max(fennec_number), 0) + 1 into new.fennec_number from profiles;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_assign_fennec_number on public.profiles;
create trigger trg_assign_fennec_number
  before insert on public.profiles
  for each row execute function public.fn_assign_fennec_number();

-- 5) Lock it: users may not change their own number.
create or replace function public.fn_protect_fennec_number()
returns trigger
language plpgsql
as $$
begin
  if new.fennec_number is distinct from old.fennec_number then
    new.fennec_number := old.fennec_number; -- silently ignore attempts
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_fennec_number on public.profiles;
create trigger trg_protect_fennec_number
  before update on public.profiles
  for each row execute function public.fn_protect_fennec_number();
