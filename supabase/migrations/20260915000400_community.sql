-- Community quiz: users can submit fill_blank questions, admin approves,
-- approved user questions form a separate community pool. Attempts on user
-- questions don't feed the ML pipeline (enforced in the submitAttempt action).

-- Extend source enum to include 'user'
alter table public.questions
  drop constraint questions_source_check;

alter table public.questions
  add constraint questions_source_check
  check (source in ('generated', 'admin', 'user'));

-- Track who submitted; null for 'generated' and 'admin' rows
alter table public.questions
  add column submitted_by uuid references public.profiles(id) on delete set null;

create index questions_submitted_by_idx on public.questions (submitted_by) where submitted_by is not null;
create index questions_source_pending_idx on public.questions (source, is_approved) where is_approved = false;

-- RLS: authenticated users can INSERT questions only when:
--   source='user', is_approved=false, submitted_by=auth.uid(), type='fill_blank'
create policy questions_user_submit on public.questions
  for insert to authenticated
  with check (
    source = 'user'
    and is_approved = false
    and submitted_by = auth.uid()
    and type = 'fill_blank'
  );

-- Users can SELECT their own pending submissions (so /profile can show them later)
create policy questions_user_read_own on public.questions
  for select to authenticated
  using (source = 'user' and submitted_by = auth.uid());

-- Users can also INSERT the associated choices (RLS on choices previously
-- only allowed service-role writes). Same restriction: only for questions
-- they submitted.
create policy choices_user_submit on public.choices
  for insert to authenticated
  with check (
    exists (
      select 1 from public.questions q
      where q.id = choices.question_id
        and q.source = 'user'
        and q.submitted_by = auth.uid()
        and q.is_approved = false
    )
  );

create policy choices_user_read_own on public.choices
  for select to authenticated
  using (
    exists (
      select 1 from public.questions q
      where q.id = choices.question_id
        and q.source = 'user'
        and q.submitted_by = auth.uid()
    )
  );

comment on column public.questions.submitted_by is
  'User who submitted this question (source=user). Null for generated/admin rows.';
