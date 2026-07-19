-- Phase 2 / §4.13 : badges (récompenses fréquentes et immédiates, complément aux paliers de points).

create table badges (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  label text not null,
  description text not null,
  tier text not null default 'bronze' check (tier in ('bronze','argent','or'))
);
alter table badges enable row level security;
create policy "catalogue de badges visible par tous" on badges for select using (true);

create table user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  badge_id uuid not null references badges(id),
  earned_at timestamptz not null default now(),
  unique (user_id, badge_id)
);
alter table user_badges enable row level security;
create policy "badges visibles par tous" on user_badges for select using (true);

insert into badges (key, label, description, tier) values
  ('premiere_question', 'Première question', 'Tu as posé ta première question', 'bronze'),
  ('premiere_reponse', 'Premier coup de main', 'Tu as répondu pour la première fois', 'bronze'),
  ('premier_document', 'Premier partage', 'Tu as publié ton premier document', 'bronze'),
  ('premiere_solution', 'Ça a marché !', 'Une de tes réponses a été validée comme solution pour la première fois', 'argent'),
  ('serie_7_jours', 'Une semaine assidue', '7 jours de contribution d''affilée', 'argent'),
  ('serie_30_jours', 'Un mois de feu', '30 jours de contribution d''affilée', 'or'),
  ('parrain', 'Parrain', 'Un ami que tu as invité est devenu actif sur Le Shabba', 'argent');

-- Compteurs dénormalisés sur profiles : le pedigrée (Annexe A.4, C.5) affiché à côté de chaque auteur
-- ne peut pas se permettre un join+count(user_badges) à chaque rendu de liste.
alter table profiles add column badges_bronze int not null default 0;
alter table profiles add column badges_argent int not null default 0;
alter table profiles add column badges_or int not null default 0;

create or replace function award_badge_once(target_user uuid, badge_key text)
returns void as $$
declare
  v_tier text;
  v_inserted boolean;
begin
  select tier into v_tier from badges where key = badge_key;

  insert into user_badges (user_id, badge_id)
  select target_user, id from badges where key = badge_key
  on conflict do nothing
  returning true into v_inserted;

  if v_inserted then
    if v_tier = 'bronze' then
      update profiles set badges_bronze = badges_bronze + 1 where id = target_user;
    elsif v_tier = 'argent' then
      update profiles set badges_argent = badges_argent + 1 where id = target_user;
    else
      update profiles set badges_or = badges_or + 1 where id = target_user;
    end if;
    insert into notifications (user_id, type, payload)
    values (target_user, 'badge_earned', jsonb_build_object('badge_key', badge_key, 'tier', v_tier));
  end if;
end;
$$ language plpgsql security definer;

-- Attribution des badges "première fois" (Annexe A.4) : le document ne précise pas de trigger SQL
-- explicite pour ceux-ci (contrairement aux points, §4.13), seulement "attribué immédiatement, appelé
-- depuis le flux concerné" — un trigger AFTER INSERT est plus fiable qu'un appel dupliqué dans chaque
-- composant client qui insère un sujet/réponse/document.
create or replace function trg_award_first_topic_badge()
returns trigger as $$
begin
  perform award_badge_once(new.author_id, 'premiere_question');
  return null;
end;
$$ language plpgsql security definer;

create trigger trg_forum_topics_first_badge
  after insert on forum_topics
  for each row execute function trg_award_first_topic_badge();

create or replace function trg_award_first_answer_badge()
returns trigger as $$
begin
  perform award_badge_once(new.author_id, 'premiere_reponse');
  return null;
end;
$$ language plpgsql security definer;

create trigger trg_forum_answers_first_badge
  after insert on forum_answers
  for each row execute function trg_award_first_answer_badge();

create or replace function trg_award_first_document_badge()
returns trigger as $$
begin
  perform award_badge_once(new.author_id, 'premier_document');
  return null;
end;
$$ language plpgsql security definer;

create trigger trg_documents_first_badge
  after insert on documents
  for each row execute function trg_award_first_document_badge();
