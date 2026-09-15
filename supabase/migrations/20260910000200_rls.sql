-- RLS + auth glue.

-- Admin check, SECURITY DEFINER so reading profiles here cannot recurse into profiles RLS.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Auto-create a profile for every new auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Privileges. RLS is the gate, but roles still need table grants to reach the policies.
grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant usage, select on sequences to authenticated;

-- profiles: a user may only change the display name; role/tier/stats come from the server.
revoke update on public.profiles from authenticated;
grant update (name) on public.profiles to authenticated;

alter table public.profiles enable row level security;
alter table public.verses enable row level security;
alter table public.questions enable row level security;
alter table public.choices enable row level security;
alter table public.attempts enable row level security;
alter table public.quiz_results enable row level security;
alter table public.user_badges enable row level security;

create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy profiles_update_own_name on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy verses_select on public.verses
  for select to authenticated
  using (true);

create policy questions_select on public.questions
  for select to authenticated
  using (is_approved or public.is_admin());

create policy choices_select on public.choices
  for select to authenticated
  using (
    exists (
      select 1 from public.questions q
      where q.id = public.choices.question_id
        and (q.is_approved or public.is_admin())
    )
  );

create policy attempts_select on public.attempts
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy attempts_insert_own on public.attempts
  for insert to authenticated
  with check (user_id = auth.uid());

create policy quiz_results_select on public.quiz_results
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy quiz_results_insert_own on public.quiz_results
  for insert to authenticated
  with check (user_id = auth.uid());

create policy user_badges_select on public.user_badges
  for select to authenticated
  using (user_id = auth.uid());
