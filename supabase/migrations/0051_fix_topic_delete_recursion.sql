-- Bug trouvé en test : la policy DELETE de forum_topics (0049) interroge forum_answers via un
-- EXISTS direct — or une policy SELECT de forum_answers (visibilité scopée école, 0037/0038) relit
-- forum_topics pour vérifier l'école, exactement le même schéma de cycle croisé déjà corrigé
-- plusieurs fois ce cycle (0032, 0044) : Postgres refuse d'évaluer une policy qui redemande,
-- directement ou via une autre table, la policy de la relation déjà en cours d'évaluation.
-- Solution identique : la vérification passe par une fonction plpgsql security definer (jamais
-- inlinée par le planneur, contrairement à `language sql`), qui contourne le RLS de forum_answers
-- au lieu de forcer sa réévaluation.
create or replace function topic_has_accepted_or_voted_answer(p_topic_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from forum_answers
    where topic_id = p_topic_id and (is_solution or votes_count > 0)
  );
end;
$$ language plpgsql stable security definer;

drop policy "auteur peut supprimer topic seulement si aucune réponse accept" on forum_topics;
create policy "auteur peut supprimer topic si aucune réponse acceptée ou votée" on forum_topics
  for delete using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin'))
    or (
      author_id = auth.uid()
      and not topic_has_accepted_or_voted_answer(forum_topics.id)
    )
  );
