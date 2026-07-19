-- Policies de visibilité scopées à l'école (§4.9) — remplacent les versions publiques pures posées en
-- §4.3/§4.4, même nom de policy, sans perdre les règles déjà en place (removed/signalé).
drop policy "documents visible sauf removed" on documents;
create policy "documents visibles selon portée" on documents for select using (
  status <> 'removed'
  and (
    school_id is null
    or exists (select 1 from school_memberships where school_id = documents.school_id and user_id = auth.uid())
    or exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin'))
  )
);

drop policy "topics visibles sauf signalés" on forum_topics;
create policy "topics visibles selon portée" on forum_topics for select using (
  (not is_flagged or author_id = auth.uid() or exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin')))
  and (
    school_id is null
    or exists (select 1 from school_memberships where school_id = forum_topics.school_id and user_id = auth.uid())
    or exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin'))
  )
);

drop policy "answers visibles sauf signalées" on forum_answers;
create policy "answers visibles selon portée" on forum_answers for select using (
  (not is_flagged or author_id = auth.uid() or exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin')))
  and exists (
    select 1 from forum_topics t where t.id = forum_answers.topic_id and (
      t.school_id is null
      or exists (select 1 from school_memberships where school_id = t.school_id and user_id = auth.uid())
      or exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin'))
    )
  )
);

-- Correction : les policies d'INSERT (documents/forum_topics/forum_answers) ne prévoyaient pas encore
-- school_id — un membre d'école pouvait publier avec school_id renseigné même sans appartenir à cette
-- école (le champ n'était simplement jamais vérifié). Remplacées ici avec le même comportement public
-- existant, plus la vérification d'appartenance quand school_id est renseigné.
drop policy "utilisateur non banni peut publier, droits certifiés" on documents;
create policy "utilisateur non banni peut publier, droits certifiés"
  on documents for insert
  with check (
    auth.uid() = author_id
    and rights_certified = true
    and not is_currently_banned(auth.uid())
    and (
      school_id is null
      or exists (select 1 from school_memberships where school_id = documents.school_id and user_id = auth.uid())
    )
    and (
      exists (select 1 from profiles where id = auth.uid() and created_at < now() - interval '48 hours')
      or count_recent_documents(auth.uid()) < 3
    )
  );

drop policy "auteur non banni peut poster" on forum_topics;
create policy "auteur non banni peut poster"
  on forum_topics for insert
  with check (
    auth.uid() = author_id
    and not is_currently_banned(auth.uid())
    and (
      school_id is null
      or exists (select 1 from school_memberships where school_id = forum_topics.school_id and user_id = auth.uid())
    )
  );

drop policy "auteur non banni peut répondre à un sujet ouvert" on forum_answers;
create policy "auteur non banni peut répondre à un sujet ouvert"
  on forum_answers for insert
  with check (
    auth.uid() = author_id
    and not is_currently_banned(auth.uid())
    and exists (select 1 from forum_topics where id = topic_id and status = 'open')
    and (
      school_id is null
      or exists (select 1 from school_memberships where school_id = forum_answers.school_id and user_id = auth.uid())
    )
    and (
      exists (select 1 from profiles where id = auth.uid() and created_at < now() - interval '48 hours')
      or count_recent_forum_answers(auth.uid()) < 5
    )
  );
