-- Compteurs publics "à la Twitter" (mis en favori / téléchargé) demandés en complément de
-- votes_count/views_count qui existaient déjà. `favorites` n'avait jamais eu de colonne dénormalisée
-- (seul votes_count était recalculé par trigger en 0005) — on applique exactement le même schéma ici.
alter table documents add column favorites_count int not null default 0;
alter table forum_topics add column favorites_count int not null default 0;
alter table forum_answers add column favorites_count int not null default 0;
alter table documents add column downloads_count int not null default 0;

create or replace function recompute_favorites_count()
returns trigger as $$
declare
  t_type text := coalesce(new.target_type, old.target_type);
  t_id uuid := coalesce(new.target_id, old.target_id);
  total int;
begin
  select count(*) into total from favorites where target_type = t_type and target_id = t_id;

  if t_type = 'topic' then
    update forum_topics set favorites_count = total where id = t_id;
  elsif t_type = 'answer' then
    update forum_answers set favorites_count = total where id = t_id;
  elsif t_type = 'document' then
    update documents set favorites_count = total where id = t_id;
  end if;

  return null;
end;
$$ language plpgsql security definer;

create trigger trg_favorites_recompute
  after insert or delete on favorites
  for each row execute function recompute_favorites_count();

-- Backfill : des favoris existent déjà depuis avant cette migration, jamais comptés jusqu'ici.
update documents set favorites_count = sub.total
  from (select target_id, count(*) as total from favorites where target_type = 'document' group by target_id) sub
  where documents.id = sub.target_id;
update forum_topics set favorites_count = sub.total
  from (select target_id, count(*) as total from favorites where target_type = 'topic' group by target_id) sub
  where forum_topics.id = sub.target_id;
update forum_answers set favorites_count = sub.total
  from (select target_id, count(*) as total from favorites where target_type = 'answer' group by target_id) sub
  where forum_answers.id = sub.target_id;

-- Téléchargement hors-ligne (PWA) : jamais tracé côté serveur jusqu'ici (le stockage se fait dans
-- IndexedDB, purement local à l'appareil) — cette fonction est appelée en plus de la mise en cache
-- locale, uniquement pour le compteur public, pas pour la logique de disponibilité hors-ligne.
create or replace function increment_document_downloads(doc_id uuid)
returns void as $$
begin
  update documents set downloads_count = downloads_count + 1 where id = doc_id;
end;
$$ language plpgsql security definer;
