-- §4.4/Annexe A.8 : "réponse à ma question" (new_answer_on_my_topic) est un type de notification à
-- part entière dans le check constraint de `notifications`, distinct de "nouvelle réponse sur un
-- sujet que je suis" (new_answer_on_followed_topic) — mais rien ne l'insérait jamais. L'auteur d'un
-- sujet n'est auto-abonné qu'en répondant à SA PROPRE question (auto_subscribe_on_answer s'abonne
-- l'auteur de la réponse, pas celui du sujet) : sans avoir cliqué "Suivre" lui-même, il ne recevait
-- donc jamais aucune notification quand on lui répondait.

create or replace function notify_subscribers_new_answer()
returns trigger as $$
declare
  v_topic_author uuid;
begin
  select author_id into v_topic_author from forum_topics where id = new.topic_id;

  if v_topic_author is not null and v_topic_author <> new.author_id then
    insert into notifications (user_id, type, target_id, payload)
    values (v_topic_author, 'new_answer_on_my_topic', new.topic_id, jsonb_build_object('answer_id', new.id));
  end if;

  insert into notifications (user_id, type, target_id, payload)
  select ts.user_id, 'new_answer_on_followed_topic', new.topic_id,
         jsonb_build_object('answer_id', new.id)
  from topic_subscriptions ts
  where ts.topic_id = new.topic_id
    and ts.user_id <> new.author_id
    and ts.user_id <> coalesce(v_topic_author, '00000000-0000-0000-0000-000000000000'::uuid);

  return new;
end;
$$ language plpgsql security definer;

-- La cloche de notifications (Annexe A.8) doit se mettre à jour sans rechargement — même besoin que
-- pour les feature flags (0012), la table doit être ajoutée explicitement à la publication.
alter publication supabase_realtime add table notifications;
