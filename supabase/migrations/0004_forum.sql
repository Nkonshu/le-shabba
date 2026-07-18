-- §4.4 Forum + notifications (migré tôt ici comme signalé dans le document, plusieurs sections en dépendent)

create table forum_topics (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles(id),
  title text not null,
  content text not null,
  level_id uuid references education_levels(id),
  subject text not null,
  tags text[] default '{}',
  attachment_url text,
  status text not null default 'open' check (status in ('open','closed_duplicate')),
  canonical_topic_id uuid references forum_topics(id),  -- rempli si status = closed_duplicate
  is_flagged boolean not null default false,
  votes_count int not null default 0,
  views_count int not null default 0,
  created_at timestamptz not null default now()
);

create table forum_answers (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references forum_topics(id) on delete cascade,
  parent_id uuid references forum_answers(id) on delete cascade,
  author_id uuid not null references profiles(id),
  type text not null check (type in ('proposal','comment')),
  content text not null,
  attachment_url text,
  is_solution boolean not null default false,
  is_flagged boolean not null default false,
  votes_count int not null default 0,
  cited_answer_id uuid references forum_answers(id) on delete set null,  -- commentaire cité en cas de "Répondre" (Annexe A.3)
  last_moderated_by uuid references profiles(id),   -- posé par mark_moderated_by en Phase 5 (§4.9), colonne prête dès maintenant
  last_moderated_at timestamptz,
  created_at timestamptz not null default now()
);

alter table forum_topics enable row level security;
alter table forum_answers enable row level security;

create policy "topics visibles sauf signalés" on forum_topics for select using (
  not is_flagged or author_id = auth.uid()
  or exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin'))
);
create policy "auteur non banni peut poster" on forum_topics for insert
  with check (auth.uid() = author_id
    and not is_currently_banned(auth.uid()));
create policy "auteur ou staff peut modifier/supprimer topic" on forum_topics
  for update using (author_id = auth.uid()
    or exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin')));
create policy "auteur ou staff peut supprimer topic" on forum_topics
  for delete using (author_id = auth.uid()
    or exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin')));

create policy "answers visibles sauf signalées" on forum_answers for select using (
  not is_flagged or author_id = auth.uid()
  or exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin'))
);
create policy "auteur non banni peut répondre à un sujet ouvert" on forum_answers for insert
  with check (auth.uid() = author_id
    and not is_currently_banned(auth.uid())
    and exists (select 1 from forum_topics where id = topic_id and status = 'open'));
create policy "auteur ou staff peut modifier/supprimer answer" on forum_answers
  for update using (author_id = auth.uid()
    or exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin')));
create policy "auteur ou staff peut supprimer answer" on forum_answers
  for delete using (author_id = auth.uid()
    or exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin')));

-- Structure conservée volontairement plate (Annexe A.3) : "Répondre à un commentaire" ne crée pas un 3e
-- niveau de parent_id, il crée un nouveau commentaire (parent_id = la proposition), avec en plus
-- cited_answer_id = le commentaire visé, pour afficher "@Auteur" en citation au rendu.
create or replace function validate_cited_answer_same_proposal()
returns trigger as $$
begin
  if new.cited_answer_id is not null then
    if new.type <> 'comment' then
      raise exception 'seul un commentaire peut citer un autre commentaire';
    end if;
    if new.cited_answer_id = new.id then
      raise exception 'un commentaire ne peut pas se citer lui-même';
    end if;
    if not exists (
      select 1 from forum_answers c
      where c.id = new.cited_answer_id and c.parent_id = new.parent_id and c.type = 'comment'
    ) then
      raise exception 'le commentaire cité doit être un commentaire de la même proposition';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_validate_cited_answer
  before insert or update on forum_answers
  for each row execute function validate_cited_answer_same_proposal();

-- ⚠️ Notifications migrées ici (juste après §4.2 en esprit), car mark_answer_as_solution ci-dessous et
-- notify_subscribers_new_answer plus bas y insèrent une ligne. Le type list ci-dessous n'inclut ici que
-- les valeurs utilisées en Phase 0 ; les valeurs liées aux points/badges/séries (Phase 2, §4.13) et aux
-- paiements (Phase 3, §4.10) restent dans le check pour ne pas devoir migrer à nouveau cette table plus tard.
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  type text not null check (type in (
    'new_answer_on_my_topic', 'answer_marked_solution', 'document_verified',
    'mention', 'rank_up', 'badge_earned', 'flag_resolved',
    'new_answer_on_followed_topic', 'streak_reminder', 'payment_pending_reminder'
  )),
  target_id uuid,
  payload jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
alter table notifications enable row level security;
create policy "notification visible par son destinataire" on notifications for select using (auth.uid() = user_id);
create policy "destinataire marque comme lue" on notifications for update using (auth.uid() = user_id);

-- Seul l'auteur du topic (ou le staff) peut marquer une solution.
-- ⚠️ Simplification volontaire pour la Phase 0 : le document (§4.4) appelle ici award_points/award_badge_once/
-- apply_referral_bonus_if_activated, mais ces fonctions ne sont définies qu'en §4.13 (Phase 2). Plutôt que de
-- faire échouer cette migration sur des fonctions inexistantes, on les diffère explicitement — à réactiver
-- (décommenter) au moment de la migration §4.13 en Phase 2, sans changer la signature de cette fonction.
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

  update forum_answers set is_solution = true where id = answer_id;
  -- perform award_points((select author_id from forum_answers where id = answer_id), 20, 'solution_validee');
  -- perform award_badge_once((select author_id from forum_answers where id = answer_id), 'premiere_solution');
  -- perform apply_referral_bonus_if_activated((select author_id from forum_answers where id = answer_id));
  insert into notifications (user_id, type, target_id, payload)
  values ((select author_id from forum_answers where id = answer_id), 'answer_marked_solution', answer_id, jsonb_build_object('points', 20));
end;
$$ language plpgsql security definer;

-- Fermeture d'un sujet en doublon : réservé aux profils ≥8000 pts (Major de Promo) ou staff
create or replace function close_topic_as_duplicate(topic_id uuid, canonical_id uuid)
returns void as $$
begin
  if not exists (
    select 1 from profiles where id = auth.uid()
    and (genie_points >= 8000 or role in ('admin','super_admin'))
  ) then
    raise exception 'Il faut au moins 8000 points de génie (ou être staff) pour fermer un sujet en doublon';
  end if;
  update forum_topics set status = 'closed_duplicate', canonical_topic_id = canonical_id where id = topic_id;
end;
$$ language plpgsql security definer;

create or replace function reopen_topic(topic_id uuid)
returns void as $$
begin
  if not exists (
    select 1 from profiles where id = auth.uid()
    and (genie_points >= 8000 or role in ('admin','super_admin'))
  ) then
    raise exception 'Il faut au moins 8000 points de génie (ou être staff) pour rouvrir un sujet';
  end if;
  update forum_topics set status = 'open', canonical_topic_id = null where id = topic_id;
end;
$$ language plpgsql security definer;

create or replace function increment_topic_views(topic_id uuid)
returns void as $$
begin
  update forum_topics set views_count = views_count + 1 where id = topic_id;
end;
$$ language plpgsql security definer;

-- Suivre un sujet : distinct des favoris (favori = "je garde pour plus tard", suivre = "préviens-moi des nouveautés")
create table topic_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  topic_id uuid not null references forum_topics(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, topic_id)
);
alter table topic_subscriptions enable row level security;
create policy "abonnements visibles par leur propriétaire" on topic_subscriptions for select using (auth.uid() = user_id);
create policy "utilisateur gère ses propres abonnements" on topic_subscriptions for insert with check (auth.uid() = user_id);
create policy "utilisateur retire ses propres abonnements" on topic_subscriptions for delete using (auth.uid() = user_id);

create or replace function auto_subscribe_on_answer()
returns trigger as $$
begin
  insert into topic_subscriptions (user_id, topic_id) values (new.author_id, new.topic_id)
  on conflict do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_auto_subscribe_on_answer
  after insert on forum_answers
  for each row execute function auto_subscribe_on_answer();

create or replace function notify_subscribers_new_answer()
returns trigger as $$
begin
  insert into notifications (user_id, type, target_id, payload)
  select ts.user_id, 'new_answer_on_followed_topic', new.topic_id,
         jsonb_build_object('answer_id', new.id)
  from topic_subscriptions ts
  where ts.topic_id = new.topic_id and ts.user_id <> new.author_id;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_notify_subscribers
  after insert on forum_answers
  for each row execute function notify_subscribers_new_answer();

-- Édition wiki des sujets, équivalent du "Improve this question" de Stack Overflow (même seuil que documents)
create table topic_versions (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references forum_topics(id) on delete cascade,
  editor_id uuid not null references profiles(id),
  diff_summary text,
  created_at timestamptz not null default now()
);
alter table topic_versions enable row level security;
create policy "historique de sujet visible par tous" on topic_versions for select using (true);
create policy "genie_points >= 3500 peut améliorer un sujet d'autrui" on topic_versions for insert with check (
  editor_id = auth.uid()
  and exists (select 1 from profiles where id = auth.uid() and genie_points >= 3500)
);

-- Traçabilité automatique de toute modération de contenu d'un tiers (Annexe C.17, "Modéré par [rôle]") —
-- posée dès Phase 0 pour forum_answers (déjà utilisée par canManage()) ; documents/forum_topics suivront
-- le même schéma en Phase 1/5 sans réécrire ce trigger.
create or replace function mark_moderated_by()
returns trigger as $$
begin
  if auth.uid() is not null and auth.uid() <> new.author_id then
    new.last_moderated_by := auth.uid();
    new.last_moderated_at := now();
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_mark_moderated_answers
  before update on forum_answers
  for each row execute function mark_moderated_by();

create or replace function log_moderation_action()
returns trigger as $$
declare
  v_author uuid := coalesce(new.author_id, old.author_id);
begin
  if auth.uid() is not null and auth.uid() <> v_author then
    insert into admin_actions_log (actor_id, action, target_type, target_id)
    values (
      auth.uid(),
      case when tg_op = 'DELETE' then 'delete_content' else 'edit_content' end,
      'answer',
      coalesce(new.id, old.id)
    );
  end if;
  return coalesce(new, old);
end;
$$ language plpgsql security definer;

create trigger trg_log_moderation_answers
  after update or delete on forum_answers
  for each row execute function log_moderation_action();
