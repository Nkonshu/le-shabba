-- Phase 2 / §4.13 : socle de réputation. Migré maintenant (après §4.2) car plusieurs fonctions déjà en
-- base (mark_answer_as_solution 0004/0017, apply_document_verification_threshold 0020, fulfill_document_request
-- 0024) ont un appel à award_points laissé en commentaire en attendant ce socle — activés en 0030.

create table gamification_config (
  key text primary key,
  value numeric not null,
  updated_by uuid references profiles(id),
  updated_at timestamptz not null default now()
);
insert into gamification_config (key, value) values ('points_multiplier', 1);
alter table gamification_config enable row level security;
create policy "config lisible par tous" on gamification_config for select using (true);
create policy "config modifiable par staff" on gamification_config for update using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin'))
);

create table points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  amount int not null,
  reason text not null,  -- 'vote','solution_validee','document_verifie','demande_satisfaite','partage_public','parrainage'
  created_at timestamptz not null default now()
);
alter table points_ledger enable row level security;
-- Public (pas restreint au propriétaire/staff) : le Panthéon (classements périodiques, 0031) agrège
-- les gains d'autrui sur une fenêtre de temps pour tout visiteur — `reason`/`amount` seuls, sans détail
-- sensible, un journal de points est comparable à l'historique de réputation public de Stack Overflow.
create policy "journal de points visible par tous" on points_ledger for select using (true);

create index points_ledger_user_created_idx on points_ledger (user_id, created_at desc);
create index points_ledger_created_idx on points_ledger (created_at);

create or replace function award_points(target_user uuid, base_amount int, reason text)
returns void as $$
declare
  v_multiplier numeric;
  v_final int;
begin
  select value into v_multiplier from gamification_config where key = 'points_multiplier';
  v_final := round(base_amount * coalesce(v_multiplier, 1));
  insert into points_ledger (user_id, amount, reason) values (target_user, v_final, reason);
  update profiles set genie_points = greatest(0, genie_points + v_final) where id = target_user;
end;
$$ language plpgsql security definer;

-- +10 points par vote positif net reçu (fonctionne aussi pour un changement/retrait de vote)
create or replace function apply_vote_points()
returns trigger as $$
declare
  v_author uuid;
  v_delta int;
  v_type text;
begin
  v_delta := coalesce(new.value, 0) - coalesce(old.value, 0);
  if v_delta = 0 then
    return null;
  end if;

  v_type := coalesce(new.target_type, old.target_type);
  if v_type = 'document' then
    select author_id into v_author from documents where id = coalesce(new.target_id, old.target_id);
  elsif v_type = 'topic' then
    select author_id into v_author from forum_topics where id = coalesce(new.target_id, old.target_id);
  else
    select author_id into v_author from forum_answers where id = coalesce(new.target_id, old.target_id);
  end if;

  perform award_points(v_author, v_delta * 10, 'vote');
  return null;
end;
$$ language plpgsql security definer;

create trigger trg_apply_vote_points
  after insert or update or delete on votes
  for each row execute function apply_vote_points();
