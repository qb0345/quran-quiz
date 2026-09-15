-- RLS policy tests. Run: supabase test db
-- Fixtures use ayah_key '115:1' (surah 115 doesn't exist in Quran, surahs 1-114
-- only) to avoid PK collision with supabase/seed.sql. Assertions that count
-- questions/choices/verses filter for fixture-specific rows (prompt LIKE 'q-%',
-- surah = 115) so the ambient seed (6236 verses, 400 questions, 1600 choices)
-- doesn't skew the counts.
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

begin;
select plan(14);

-- fixtures (as postgres: bypasses RLS). If the auth.users insert fails on a
-- NOT NULL column added by a newer GoTrue, inspect `docker exec supabase_db_quran-quiz
-- psql -U postgres -c "\d auth.users"` and add the column here with a fixed value.
insert into auth.users
  (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
   'authenticated', 'authenticated', 'alice@test.local', 'x', now(), now(), now(), '{"name":"Alice"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222',
   'authenticated', 'authenticated', 'admin@test.local', 'x', now(), now(), now(), '{"name":"Admin"}'::jsonb);

update public.profiles set role = 'admin' where id = '22222222-2222-2222-2222-222222222222';

insert into public.verses (ayah_key, surah, ayah, juz, page, text, text_normalized)
values ('115:1', 115, 1, 30, 604, 'fixture verse', 'fixture verse')
on conflict (ayah_key) do nothing;

insert into public.questions (type, quiz_key, prompt, instruction, ayah_key, payload, correct_idx, is_approved, source)
values ('which_surah', 'mix', 'q-approved', 'i', '115:1', '{}', 0, true, 'generated'),
       ('which_surah', 'mix', 'q-pending',  'i', '115:1', '{}', 0, false, 'generated');

insert into public.choices (question_id, option_text, position)
select id, 'x', 0 from public.questions where prompt like 'q-%';

-- 1. trigger created one profile per auth user (seed doesn't touch profiles).
select is((select count(*)::int from public.profiles), 2, 'handle_new_user creates a profile per user');

-- switch to player alice
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

select is((select count(*)::int from public.profiles), 1, 'player sees only own profile');
select is((select count(*)::int from public.questions where prompt like 'q-%'), 1, 'player sees only approved fixture questions');
select is(
  (select count(*)::int from public.choices c join public.questions q on q.id = c.question_id where q.prompt like 'q-%'),
  1,
  'player sees only choices of approved fixture questions'
);
select is(public.is_admin(), false, 'is_admin is false for player');
select lives_ok($$update public.profiles set name = 'Alice B' where id = auth.uid()$$,
  'player can update own display name');
select throws_ok($$update public.profiles set tier = 'gold' where id = auth.uid()$$,
  '42501', null, 'player cannot update tier (column privilege denied)');
select lives_ok($$insert into public.attempts (user_id, question_id, correct, response_ms, elo_before)
  values (auth.uid(), (select id from public.questions where prompt like 'q-%' and is_approved limit 1), true, 1200, 1200)$$,
  'player can insert own attempt');
select throws_ok($$insert into public.attempts (user_id, question_id, correct, response_ms, elo_before)
  values ('22222222-2222-2222-2222-222222222222', (select id from public.questions where prompt like 'q-%' and is_approved limit 1), true, 1000, 1200)$$,
  '42501', null, 'player cannot insert an attempt for another user');
select is((select count(*)::int from public.attempts), 1, 'player sees only own attempts');
select is((select count(*)::int from public.verses where surah = 115), 1, 'authenticated user reads fixture verse');

-- switch to admin (same role, admin claims)
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);

select is(public.is_admin(), true, 'is_admin is true for admin');
select is((select count(*)::int from public.questions where prompt like 'q-%'), 2, 'admin sees unapproved fixture questions');
select is((select count(*)::int from public.profiles), 2, 'admin sees all profiles');

select * from finish();
rollback;
