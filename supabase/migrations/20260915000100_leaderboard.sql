-- Leaderboard view. Exposes only the columns safe for public display.
-- SECURITY DEFINER (the default for views) means the view runs with the
-- privileges of the view creator (superuser during migration), bypassing RLS
-- on the underlying profiles table. This lets authenticated users see all rows
-- through the view without touching the existing profiles_select policy.
create view public.public_profiles as
select id, name, tier, lifetime_xp
from public.profiles;

comment on view public.public_profiles is 'Leaderboard-safe projection of profiles. SECURITY DEFINER view bypasses RLS on profiles.';

-- Grant read to authenticated users. They access this view, not the full table.
grant select on public.public_profiles to authenticated;
