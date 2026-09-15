-- Quran Quiz core schema.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  role text not null default 'player' check (role in ('player','admin')),
  tier text not null default 'bronze' check (tier in ('bronze','silver','gold','diamond','legendary')),
  current_streak int not null default 0,
  longest_streak int not null default 0,
  days_played int not null default 0,
  last_played_date date,
  total_quizzes int not null default 0,
  total_correct int not null default 0,
  total_questions int not null default 0,
  max_session_combo int not null default 0,
  best_time_ms bigint,
  lifetime_xp int not null default 0,
  skill_elo real not null default 1200,
  created_at timestamptz not null default now()
);
create index profiles_xp_idx on public.profiles (lifetime_xp desc);

create table public.verses (
  ayah_key text primary key,
  surah smallint not null,
  ayah smallint not null,
  juz smallint not null,
  page smallint not null,
  text text not null,             -- verbatim Tanzil Uthmani; NEVER transform
  text_normalized text not null   -- derived comparison form; never displayed
);
create index verses_juz_idx on public.verses (juz);
create index verses_surah_idx on public.verses (surah);

create table public.questions (
  id bigserial primary key,
  type text not null check (type in ('which_surah','next_ayah','fill_blank')),
  quiz_key text not null,
  prompt text not null,
  instruction text not null,
  ayah_key text not null references public.verses(ayah_key) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  correct_idx smallint not null,
  elo real not null default 1200,
  band smallint not null default 3,
  is_approved boolean not null default false,
  source text not null check (source in ('generated','admin')),
  created_at timestamptz not null default now()
);
create index questions_quiz_idx on public.questions (quiz_key);
create index questions_band_idx on public.questions (band, is_approved);
create index questions_elo_idx on public.questions (elo);

create table public.choices (
  id bigserial primary key,
  question_id bigint not null references public.questions(id) on delete cascade,
  option_text text not null,
  position smallint not null,
  unique (question_id, position)
);

create table public.attempts (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_id bigint not null references public.questions(id) on delete cascade,
  correct boolean not null,
  response_ms int not null,
  elo_before real not null,
  ts timestamptz not null default now()
);
create index attempts_user_ts_idx on public.attempts (user_id, ts);
create index attempts_question_idx on public.attempts (question_id);

create table public.quiz_results (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  quiz_key text not null,
  score int not null,
  total int not null,
  elapsed_ms bigint not null,
  max_combo int not null,
  xp_awarded int not null,
  ts timestamptz not null default now()
);
create index quiz_results_mode_idx on public.quiz_results (quiz_key, score desc);
create index quiz_results_user_idx on public.quiz_results (user_id);

create table public.user_badges (
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_id text not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);
