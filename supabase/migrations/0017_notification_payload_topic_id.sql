-- La cloche de notifications (Annexe A.8/C.14) doit pouvoir construire un lien direct vers le sujet
-- concerné pour chaque notification. `answer_marked_solution` ne stockait que `target_id` = l'id de
-- la réponse, pas du sujet — obligeant une requête supplémentaire à l'affichage pour retrouver le
-- sujet parent. Plus simple d'inclure `topic_id` dans le payload dès l'insertion.

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
  values (
    (select author_id from forum_answers where id = answer_id),
    'answer_marked_solution',
    answer_id,
    jsonb_build_object('points', 20, 'topic_id', v_topic_id)
  );
end;
$$ language plpgsql security definer;
