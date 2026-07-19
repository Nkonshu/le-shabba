-- CRUD façon Stack Overflow : éditer son propre sujet/réponse/commentaire reste toujours permis
-- (déjà le cas, policy UPDATE inchangée), mais SUPPRIMER un sujet ou une réponse qui a déjà de la
-- valeur pour d'autres ne doit plus être laissé à la seule discrétion de l'auteur — c'est
-- exactement la règle SO : impossible de supprimer une question avec une réponse acceptée ou votée,
-- ni une réponse elle-même acceptée. Le staff et les mini-admins d'école (policies 0040, distinctes,
-- non touchées ici) restent libres de tout supprimer à des fins de modération.

drop policy "auteur ou staff peut supprimer topic" on forum_topics;
create policy "auteur peut supprimer topic seulement si aucune réponse acceptée ou votée" on forum_topics
  for delete using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin'))
    or (
      author_id = auth.uid()
      and not exists (
        select 1 from forum_answers
        where topic_id = forum_topics.id and (is_solution or votes_count > 0)
      )
    )
  );

drop policy "auteur ou staff peut supprimer answer" on forum_answers;
create policy "auteur peut supprimer answer seulement si pas la solution acceptée" on forum_answers
  for delete using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin'))
    or (author_id = auth.uid() and not is_solution)
  );
