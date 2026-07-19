-- Phase 2 / §4.13 : séries quotidiennes (façon Duolingo).

alter table profiles add column current_streak int not null default 0;
alter table profiles add column longest_streak int not null default 0;
alter table profiles add column last_activity_date date;

create or replace function record_daily_activity(target_user uuid)
returns void as $$
declare
  v_last date;
  v_streak int;
begin
  select last_activity_date into v_last from profiles where id = target_user;

  if v_last = current_date then
    return; -- déjà comptabilisé aujourd'hui, rien à faire
  elsif v_last = current_date - interval '1 day' then
    update profiles set current_streak = current_streak + 1, last_activity_date = current_date where id = target_user;
  else
    update profiles set current_streak = 1, last_activity_date = current_date where id = target_user;
  end if;

  update profiles set longest_streak = greatest(longest_streak, current_streak) where id = target_user
  returning current_streak into v_streak;

  if v_streak = 7 then
    perform award_badge_once(target_user, 'serie_7_jours');
  elsif v_streak = 30 then
    perform award_badge_once(target_user, 'serie_30_jours');
  end if;
end;
$$ language plpgsql security definer;

-- Toute action de contribution (question, réponse, document, vote — Annexe A.4) alimente la série.
-- Réutilise les triggers "premier badge" déjà posés en 0027 plutôt que d'en ajouter trois de plus sur
-- les mêmes tables (l'ordre d'exécution entre triggers du même événement n'a pas d'importance ici,
-- chaque fonction est indépendante).
create or replace function trg_award_first_topic_badge()
returns trigger as $$
begin
  perform award_badge_once(new.author_id, 'premiere_question');
  perform record_daily_activity(new.author_id);
  return null;
end;
$$ language plpgsql security definer;

create or replace function trg_award_first_answer_badge()
returns trigger as $$
begin
  perform award_badge_once(new.author_id, 'premiere_reponse');
  perform record_daily_activity(new.author_id);
  return null;
end;
$$ language plpgsql security definer;

create or replace function trg_award_first_document_badge()
returns trigger as $$
begin
  perform award_badge_once(new.author_id, 'premier_document');
  perform record_daily_activity(new.author_id);
  return null;
end;
$$ language plpgsql security definer;

-- Le vote est aussi une contribution (Annexe A.4) mais ne doit compter qu'à l'émission, pas à un
-- changement/retrait (contrairement à apply_vote_points qui, lui, réagit aussi à update/delete).
create or replace function trg_record_daily_activity_on_vote()
returns trigger as $$
begin
  perform record_daily_activity(new.user_id);
  return null;
end;
$$ language plpgsql security definer;

create trigger trg_votes_daily_activity
  after insert on votes
  for each row execute function trg_record_daily_activity_on_vote();
