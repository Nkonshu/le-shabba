-- §4.5 Votes & favoris — le vote est un upsert + trigger de recalcul dès le départ, jamais un simple INSERT.

create table votes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  target_type text not null check (target_type in ('topic','answer','document')),
  target_id uuid not null,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  unique (user_id, target_type, target_id)
);
alter table votes enable row level security;
create policy "vote visible par tous" on votes for select using (true);

-- "On ne peut pas voter sur son propre contenu" appliqué en policy, pas seulement en intention côté UI.
create policy "utilisateur vote pour lui-même, jamais sur son propre contenu" on votes for insert with check (
  auth.uid() = user_id
  and (
    (target_type = 'topic' and not exists (select 1 from forum_topics where id = target_id and author_id = auth.uid()))
    or (target_type = 'answer' and not exists (select 1 from forum_answers where id = target_id and author_id = auth.uid()))
    or (target_type = 'document' and not exists (select 1 from documents where id = target_id and author_id = auth.uid()))
  )
);
create policy "utilisateur modifie son propre vote" on votes for update using (auth.uid() = user_id);
create policy "utilisateur retire son propre vote" on votes for delete using (auth.uid() = user_id);

-- Trigger générique : recalcule votes_count sur la cible à chaque insert/update/delete.
-- S'applique aussi bien aux propositions qu'aux commentaires du forum (target_type='answer' ne distingue
-- pas forum_answers.type) — voir Annexe C.17.
create or replace function recompute_votes_count()
returns trigger as $$
declare
  t_type text := coalesce(new.target_type, old.target_type);
  t_id uuid := coalesce(new.target_id, old.target_id);
  total int;
begin
  select coalesce(sum(value), 0) into total from votes where target_type = t_type and target_id = t_id;

  if t_type = 'topic' then
    update forum_topics set votes_count = total where id = t_id;
  elsif t_type = 'answer' then
    update forum_answers set votes_count = total where id = t_id;
  elsif t_type = 'document' then
    update documents set votes_count = total where id = t_id;
  end if;

  return null;
end;
$$ language plpgsql security definer;

create trigger trg_votes_recompute
  after insert or update or delete on votes
  for each row execute function recompute_votes_count();

create table favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  target_type text not null check (target_type in ('topic','answer','document')),
  target_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, target_type, target_id)
);
alter table favorites enable row level security;
create policy "favoris privés" on favorites for select using (auth.uid() = user_id);
create policy "favoris gérés par leur propriétaire" on favorites for insert with check (auth.uid() = user_id);
create policy "suppression favoris par propriétaire" on favorites for delete using (auth.uid() = user_id);
