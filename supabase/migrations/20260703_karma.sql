-- ═══════════════════════════════════════════════════════════════
-- KARMA ECONOMY — La Cinta Marcada (see DESIGN.md)
-- Rules (Paco, 2026-07-03):
--   · everyone starts with 5 karma (first upload free)
--   · +1 karma for your first comment on someone else's track
--   · +2 karma when the track owner stamps your comment ("this helped")
--   · uploading a track costs 5 karma
--   · Pro: first 5 uploads each month are free; after that, pays karma
-- All enforcement lives server-side (triggers + security-definer RPC)
-- so the client can never fake it.
-- ═══════════════════════════════════════════════════════════════

-- 1) Balance on profiles ------------------------------------------------
alter table public.profiles
  add column if not exists karma integer not null default 5;

-- 2) Stamp flag on comments ---------------------------------------------
alter table public.review_comments
  add column if not exists stamped boolean not null default false;

-- 3) Audit ledger (dedupe + history) -------------------------------------
create table if not exists public.karma_ledger (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  delta      integer not null,
  reason     text not null check (reason in ('comment', 'stamp', 'upload', 'signup')),
  ref_id     uuid,
  created_at timestamptz not null default now()
);
alter table public.karma_ledger enable row level security;

drop policy if exists "read own karma ledger" on public.karma_ledger;
create policy "read own karma ledger" on public.karma_ledger
  for select using (auth.uid() = user_id);
-- no insert/update/delete policies: only definer functions write

-- 4) Earn +1 on first comment on someone else's track --------------------
create or replace function public.fn_karma_on_comment()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_owner uuid;
begin
  select user_id into v_owner from project_reviews where id = new.track_id;
  if v_owner is null or v_owner = new.user_id then
    return new; -- own track or orphan: no karma
  end if;
  -- only the FIRST comment by this user on this track earns
  if exists (
    select 1 from review_comments
    where track_id = new.track_id and user_id = new.user_id and id <> new.id
  ) then
    return new;
  end if;
  update profiles set karma = karma + 1 where id = new.user_id;
  insert into karma_ledger (user_id, delta, reason, ref_id)
  values (new.user_id, 1, 'comment', new.id);
  return new;
end;
$$;

drop trigger if exists trg_karma_on_comment on public.review_comments;
create trigger trg_karma_on_comment
  after insert on public.review_comments
  for each row execute function public.fn_karma_on_comment();

-- 5) Uploads cost 5 karma (Pro: 5 free per calendar month) ----------------
create or replace function public.fn_karma_on_upload()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_karma integer;
  v_pro   boolean;
  v_month_uploads integer;
begin
  select karma, coalesce(is_pro, false) into v_karma, v_pro
  from profiles where id = new.user_id;

  if v_pro then
    select count(*) into v_month_uploads from project_reviews
    where user_id = new.user_id
      and created_at >= date_trunc('month', now());
    if v_month_uploads < 5 then
      return new; -- free Pro upload this month, no karma spent
    end if;
  end if;

  if v_karma is null or v_karma < 5 then
    raise exception 'NOT_ENOUGH_KARMA';
  end if;

  update profiles set karma = karma - 5 where id = new.user_id;
  insert into karma_ledger (user_id, delta, reason, ref_id)
  values (new.user_id, -5, 'upload', new.id);
  return new;
end;
$$;

drop trigger if exists trg_karma_on_upload on public.project_reviews;
create trigger trg_karma_on_upload
  before insert on public.project_reviews
  for each row execute function public.fn_karma_on_upload();

-- 6) Stamp RPC — only the track owner can stamp, +2 to the commenter ------
create or replace function public.stamp_comment(p_comment_id uuid)
returns json
language plpgsql security definer set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_comment record;
  v_track   record;
begin
  if v_caller is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  select * into v_comment from review_comments where id = p_comment_id;
  if not found then
    raise exception 'COMMENT_NOT_FOUND';
  end if;

  select * into v_track from project_reviews where id = v_comment.track_id;
  if not found or v_track.user_id <> v_caller then
    raise exception 'NOT_TRACK_OWNER';
  end if;

  if v_comment.user_id = v_caller then
    raise exception 'CANNOT_STAMP_OWN_COMMENT';
  end if;

  if v_comment.stamped then
    return json_build_object('ok', true, 'already', true);
  end if;

  update review_comments set stamped = true where id = p_comment_id;
  update profiles set karma = karma + 2 where id = v_comment.user_id;
  insert into karma_ledger (user_id, delta, reason, ref_id)
  values (v_comment.user_id, 2, 'stamp', p_comment_id);

  return json_build_object('ok', true);
end;
$$;

grant execute on function public.stamp_comment(uuid) to authenticated;

-- 7) Fair backfill for existing users -------------------------------------
-- Everyone got the default 5; add +1 per distinct foreign track they
-- already commented on, so early reviewers don't start from zero credit.
update public.profiles p
set karma = 5 + coalesce((
  select count(distinct rc.track_id)
  from public.review_comments rc
  join public.project_reviews pr on pr.id = rc.track_id
  where rc.user_id = p.id and pr.user_id <> p.id
), 0);
