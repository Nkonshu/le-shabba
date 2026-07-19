-- Complète 0049 : une proposition ne devrait pas être supprimable par son auteur seulement parce
-- qu'elle n'est pas *la* solution acceptée — si elle a déjà des votes positifs, elle a déjà de la
-- valeur pour d'autres, même principe que pour le sujet (votes_count > 0). Ne s'applique qu'aux
-- propositions (type='proposal') : un commentaire reste librement supprimable par son auteur quel
-- que soit son nombre de votes — enjeu bien plus faible, cohérent avec l'esprit Stack Overflow.
drop policy "auteur peut supprimer answer seulement si pas la solution acceptée" on forum_answers;
create policy "auteur peut supprimer answer selon règles SO par type" on forum_answers
  for delete using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin'))
    or (
      author_id = auth.uid()
      and (
        type = 'comment'
        or (type = 'proposal' and not is_solution and votes_count <= 0)
      )
    )
  );
