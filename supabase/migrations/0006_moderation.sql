-- §4.6 Modération — signalements + seuil de dépublication automatique (config ajustable sans redéploiement)

create table flags (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('topic','answer','document','user','tutoring_session')),
  target_id uuid not null,       -- si target_type = 'user', c'est l'id du profil signalé
  reporter_id uuid not null references profiles(id),
  reason text not null check (reason in ('hors_sujet','faux','doublon','contenu_protege','inapproprie','harcelement','autre')),
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now()
);
alter table flags enable row level security;
create policy "signalement visible par genie_points >= 1200 ou staff" on flags for select using (
  exists (select 1 from profiles where id = auth.uid() and (genie_points >= 1200 or role in ('admin','super_admin')))
);
create policy "genie_points >= 1200 peut signaler" on flags for insert with check (
  reporter_id = auth.uid()
  and exists (select 1 from profiles where id = auth.uid() and genie_points >= 1200)
);

create table moderation_config (
  key text primary key,
  value numeric not null,
  updated_by uuid references profiles(id),
  updated_at timestamptz not null default now()
);
insert into moderation_config (key, value) values ('auto_flag_threshold', 3);
alter table moderation_config enable row level security;
create policy "config modération lisible par staff" on moderation_config for select using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin'))
);
create policy "config modération modifiable par staff" on moderation_config for update using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin'))
);

-- Dépublication automatique dès que le nombre de signalements ouverts distincts atteint le seuil configuré.
-- Jamais sur 'user' ni 'tutoring_session' : ces deux cibles restent en examen humain pur (cf. note plus bas).
create or replace function apply_auto_flag_threshold()
returns trigger as $$
declare
  v_threshold numeric;
  v_count int;
begin
  if new.target_type not in ('topic', 'answer', 'document') then
    return new;
  end if;

  select value into v_threshold from moderation_config where key = 'auto_flag_threshold';
  select count(*) into v_count from flags
    where target_type = new.target_type and target_id = new.target_id and status = 'open';

  if v_count >= v_threshold then
    if new.target_type = 'document' then
      update documents set status = 'flagged' where id = new.target_id and status <> 'flagged';
    elsif new.target_type = 'topic' then
      update forum_topics set is_flagged = true where id = new.target_id;
    elsif new.target_type = 'answer' then
      update forum_answers set is_flagged = true where id = new.target_id;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_auto_flag_threshold
  after insert on flags
  for each row execute function apply_auto_flag_threshold();

-- Signaler un utilisateur ou une session de tutorat ne déclenche jamais d'action automatique : entrée
-- prioritaire en file de modération pour examen humain, quel que soit le nombre accumulé.
