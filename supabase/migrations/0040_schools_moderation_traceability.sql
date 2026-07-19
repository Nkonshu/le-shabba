-- Extension des policies de modération de contenu (documents/forum) au rôle d'école (§4.9), en
-- complément (pas en remplacement) des policies déjà posées — Postgres combine plusieurs policies
-- permissives par OR, donc ces `create policy` s'ajoutent sans rien casser.
create policy "school_admin/school_moderator modère le contenu de son école (documents)"
  on documents for update using (
    school_id is not null
    and exists (
      select 1 from school_memberships
      where school_id = documents.school_id and user_id = auth.uid()
      and (role = 'school_admin' or (role = 'school_moderator' and coalesce((permissions->>'documents')::boolean, true)))
    )
  );

create policy "school_admin/school_moderator supprime le contenu de son école (documents)"
  on documents for delete using (
    school_id is not null
    and exists (
      select 1 from school_memberships
      where school_id = documents.school_id and user_id = auth.uid()
      and (role = 'school_admin' or (role = 'school_moderator' and coalesce((permissions->>'documents')::boolean, true)))
    )
  );

create policy "school_admin/school_moderator modère les sujets de son école"
  on forum_topics for update using (
    school_id is not null
    and exists (
      select 1 from school_memberships
      where school_id = forum_topics.school_id and user_id = auth.uid()
      and (role = 'school_admin' or (role = 'school_moderator' and coalesce((permissions->>'forum')::boolean, true)))
    )
  );

create policy "school_admin/school_moderator supprime les sujets de son école"
  on forum_topics for delete using (
    school_id is not null
    and exists (
      select 1 from school_memberships
      where school_id = forum_topics.school_id and user_id = auth.uid()
      and (role = 'school_admin' or (role = 'school_moderator' and coalesce((permissions->>'forum')::boolean, true)))
    )
  );

create policy "school_admin/school_moderator modère les réponses de son école"
  on forum_answers for update using (
    exists (
      select 1 from forum_topics t
      join school_memberships sm on sm.school_id = t.school_id
      where t.id = forum_answers.topic_id and sm.user_id = auth.uid()
      and (sm.role = 'school_admin' or (sm.role = 'school_moderator' and coalesce((sm.permissions->>'forum')::boolean, true)))
    )
  );

create policy "school_admin/school_moderator supprime les réponses de son école"
  on forum_answers for delete using (
    exists (
      select 1 from forum_topics t
      join school_memberships sm on sm.school_id = t.school_id
      where t.id = forum_answers.topic_id and sm.user_id = auth.uid()
      and (sm.role = 'school_admin' or (sm.role = 'school_moderator' and coalesce((sm.permissions->>'forum')::boolean, true)))
    )
  );

-- Traçabilité : mark_moderated_by existe déjà (posé en 0004 pour forum_answers, en prévision explicite
-- de cette extension) — on l'étend simplement à documents/forum_topics, sans toucher à la fonction.
create trigger trg_mark_moderated_documents before update on documents
  for each row execute function mark_moderated_by();
create trigger trg_mark_moderated_topics before update on forum_topics
  for each row execute function mark_moderated_by();

-- log_moderation_action existe déjà mais codait en dur target_type='answer' et ignorait school_id
-- (school_id n'existait pas encore). Généralisée ici avec un argument de trigger (tg_argv[0]) — la
-- trigger existante sur forum_answers est recréée pour lui passer cet argument, comportement inchangé.
drop trigger trg_log_moderation_answers on forum_answers;

create or replace function log_moderation_action()
returns trigger as $$
declare
  v_author uuid := coalesce(new.author_id, old.author_id);
  v_school uuid := coalesce(new.school_id, old.school_id);
begin
  if auth.uid() is not null and auth.uid() <> v_author then
    insert into admin_actions_log (actor_id, action, target_type, target_id, school_id)
    values (
      auth.uid(),
      case when tg_op = 'DELETE' then 'delete_content' else 'edit_content' end,
      tg_argv[0],
      coalesce(new.id, old.id),
      v_school
    );
  end if;
  return coalesce(new, old);
end;
$$ language plpgsql security definer;

create trigger trg_log_moderation_documents after update or delete on documents
  for each row execute function log_moderation_action('document');
create trigger trg_log_moderation_topics after update or delete on forum_topics
  for each row execute function log_moderation_action('topic');
create trigger trg_log_moderation_answers after update or delete on forum_answers
  for each row execute function log_moderation_action('answer');

-- Visibilité des signalements étendue au mini-admin d'école — sans cette policy, un school_moderator
-- sans réputation plateforme élevée ne verrait jamais les signalements de sa propre école (la policy
-- de §4.6 ne couvre que genie_points >= 1200 ou staff).
create policy "school_admin/school_moderator voit les signalements de son école" on flags for select using (
  exists (
    select 1 from school_memberships sm
    where sm.user_id = auth.uid() and sm.role in ('school_admin','school_moderator')
    and (
      exists (select 1 from documents d where d.id = flags.target_id and d.school_id = sm.school_id)
      or exists (select 1 from forum_topics t where t.id = flags.target_id and t.school_id = sm.school_id)
      or exists (
        select 1 from forum_answers a join forum_topics t2 on t2.id = a.topic_id
        where a.id = flags.target_id and t2.school_id = sm.school_id
      )
    )
  )
);
