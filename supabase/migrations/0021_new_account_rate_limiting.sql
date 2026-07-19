-- Phase 1 (§9/Annexe A.5) : "Rate limiting comptes < 48h : max 3 documents et 5 réponses de forum" —
-- appliqué directement dans les policies d'insert (pas seulement côté UI), comme l'exige §3.

drop policy "utilisateur non banni peut publier, droits certifiés" on documents;
create policy "utilisateur non banni peut publier, droits certifiés"
  on documents for insert
  with check (
    auth.uid() = author_id
    and rights_certified = true
    and not is_currently_banned(auth.uid())
    and (
      exists (select 1 from profiles where id = auth.uid() and created_at < now() - interval '48 hours')
      or (select count(*) from documents d where d.author_id = auth.uid() and d.created_at > now() - interval '48 hours') < 3
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
      exists (select 1 from profiles where id = auth.uid() and created_at < now() - interval '48 hours')
      or (select count(*) from forum_answers a where a.author_id = auth.uid() and a.created_at > now() - interval '48 hours') < 5
    )
  );
