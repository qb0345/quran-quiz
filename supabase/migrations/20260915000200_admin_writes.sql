-- Admin can write to questions/choices via their own session (not just service role).
-- proxy.ts already gates /admin/* behind role=admin AAL2 — this layer is defense-in-depth.

create policy questions_admin_write on public.questions
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy choices_admin_write on public.choices
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
