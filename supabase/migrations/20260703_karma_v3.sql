-- ═══════════════════════════════════════════════════════════════
-- KARMA v3 — anti-collusion locks on stamp payouts (Paco, 2026-07-03)
-- The farming vector after v2: two friends stamping each other's
-- comments repeatedly. Stamps stay unlimited SOCIALLY (the badge
-- always lands), but the +2 payout is gated:
--   · Lock 1: pays at most ONCE per commenter per track. Gifting a
--     friend +2 again requires a new upload (−5) → farming is
--     net-negative by construction.
--   · Lock 2: pays at most 3 times per 7 days from the same artist
--     to the same commenter (across all their tracks) — closes the
--     Pro-free-uploads loophole.
-- ═══════════════════════════════════════════════════════════════

create or replace function public.stamp_comment(p_comment_id uuid)
returns json
language plpgsql security definer set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_comment record;
  v_track   record;
  v_already_paid_track boolean;
  v_week_count integer;
  v_pay boolean := true;
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
    return json_build_object('ok', true, 'already', true, 'karma_paid', false, 'reason', 'already_stamped');
  end if;

  -- Lock 1: karma already paid to this commenter on this track?
  select exists (
    select 1
    from karma_ledger kl
    join review_comments rc on rc.id::text = kl.ref_id
    where kl.reason = 'stamp'
      and kl.user_id = v_comment.user_id
      and rc.track_id = v_comment.track_id
  ) into v_already_paid_track;

  -- Lock 2: paid stamps from this artist to this commenter in the last 7 days
  select count(*) into v_week_count
  from karma_ledger kl
  join review_comments rc on rc.id::text = kl.ref_id
  join project_reviews pr on pr.id = rc.track_id
  where kl.reason = 'stamp'
    and kl.user_id = v_comment.user_id
    and pr.user_id = v_caller
    and kl.created_at > now() - interval '7 days';

  if v_already_paid_track or v_week_count >= 3 then
    v_pay := false;
  end if;

  -- The social seal always lands; only the payout is gated
  update review_comments set stamped = true where id = p_comment_id;

  if v_pay then
    update profiles set karma = karma + 2 where id = v_comment.user_id;
    insert into karma_ledger (user_id, delta, reason, ref_id)
    values (v_comment.user_id, 2, 'stamp', p_comment_id::text);
  end if;

  -- reason tells the UI why a seal didn't pay, so the artist isn't left guessing
  return json_build_object(
    'ok', true,
    'karma_paid', v_pay,
    'reason', case
      when v_pay then 'paid'
      when v_already_paid_track then 'track_already_paid'
      else 'weekly_cap'
    end
  );
end;
$$;

grant execute on function public.stamp_comment(uuid) to authenticated;
