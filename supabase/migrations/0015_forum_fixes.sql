-- §4.4 : la règle métier de l'Annexe A.3 ("Une seule réponse peut être is_solution=true par sujet :
-- mark_answer_as_solution doit d'abord repasser les autres réponses du même topic à false avant d'en
-- valider une nouvelle") n'était pas appliquée dans la fonction migrée en 0004 — elle se contentait de
-- passer la nouvelle réponse à true, sans jamais redescendre une éventuelle solution précédente.

create or replace function mark_answer_as_solution(answer_id uuid)
returns void as $$
declare
  v_topic_author uuid;
  v_topic_id uuid;
begin
  select topic_id into v_topic_id from forum_answers where id = answer_id;
  select author_id into v_topic_author from forum_topics where id = v_topic_id;

  if v_topic_author <> auth.uid()
     and not exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin')) then
    raise exception 'Seul l''auteur du sujet peut valider une solution';
  end if;

  update forum_answers set is_solution = false where topic_id = v_topic_id and is_solution = true;
  update forum_answers set is_solution = true where id = answer_id;
  -- perform award_points((select author_id from forum_answers where id = answer_id), 20, 'solution_validee');
  -- perform award_badge_once((select author_id from forum_answers where id = answer_id), 'premiere_solution');
  -- perform apply_referral_bonus_if_activated((select author_id from forum_answers where id = answer_id));
  insert into notifications (user_id, type, target_id, payload)
  values ((select author_id from forum_answers where id = answer_id), 'answer_marked_solution', answer_id, jsonb_build_object('points', 20));
end;
$$ language plpgsql security definer;

-- Bucket pour les pièces jointes du forum (questions/réponses) — distinct du bucket `documents`
-- (bibliothèque curatée, admin-only en Phase 0) : ouvert à tout utilisateur non banni, comme
-- l'autorise déjà la policy d'insert sur forum_topics/forum_answers (0004).
insert into storage.buckets (id, name, public, file_size_limit)
values ('forum-attachments', 'forum-attachments', true, 10485760)
on conflict (id) do nothing;

create policy "forum attachments are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'forum-attachments');

create policy "non-banned users upload forum attachments"
  on storage.objects for insert
  with check (
    bucket_id = 'forum-attachments'
    and auth.uid() is not null
    and not is_currently_banned(auth.uid())
  );

create policy "owner or staff updates forum attachments"
  on storage.objects for update
  using (
    bucket_id = 'forum-attachments'
    and (owner = auth.uid() or exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin')))
  );

create policy "owner or staff deletes forum attachments"
  on storage.objects for delete
  using (
    bucket_id = 'forum-attachments'
    and (owner = auth.uid() or exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin')))
  );
