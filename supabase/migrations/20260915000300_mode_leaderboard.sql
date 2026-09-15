-- Per-mode leaderboard: best score/total ratio per (user, mode), tiebreak elapsed_ms asc.
-- SECURITY DEFINER (default) so it bypasses RLS on quiz_results (which is own-or-admin).
create view public.public_mode_leaderboard as
select distinct on (r.user_id, r.quiz_key)
  r.user_id,
  r.quiz_key,
  p.name,
  p.tier,
  r.score,
  r.total,
  r.elapsed_ms,
  round((r.score::numeric / nullif(r.total, 0))::numeric, 4) as ratio
from public.quiz_results r
join public.profiles p on p.id = r.user_id
order by r.user_id, r.quiz_key, (r.score::numeric / nullif(r.total, 0)) desc, r.elapsed_ms asc;

comment on view public.public_mode_leaderboard is 'Best (user, mode) row for leaderboard. SECURITY DEFINER; bypasses RLS on quiz_results.';

grant select on public.public_mode_leaderboard to authenticated;
