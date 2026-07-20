-- Jusqu'ici views_count/downloads_count sont de simples compteurs incrémentés en place — aucun
-- historique, impossible de tracer une courbe "vues dans le temps". Cette table capture chaque
-- événement individuellement (une ligne par vue/téléchargement), en plus du compteur existant
-- (qui reste la source rapide pour l'affichage public — cette table ne sert qu'au reporting admin).
create table content_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('document_view', 'document_download', 'topic_view')),
  target_id uuid not null,
  user_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table content_events enable row level security;
create policy "événements de contenu visibles par le staff" on content_events for select using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'super_admin'))
);
-- Pas de policy insert : les trois fonctions ci-dessous sont security definer et les seules à écrire ici.

create or replace function increment_document_views(doc_id uuid)
returns void as $$
begin
  update documents set views_count = views_count + 1 where id = doc_id;
  insert into content_events (event_type, target_id, user_id) values ('document_view', doc_id, auth.uid());
end;
$$ language plpgsql security definer;

create or replace function increment_document_downloads(doc_id uuid)
returns void as $$
begin
  update documents set downloads_count = downloads_count + 1 where id = doc_id;
  insert into content_events (event_type, target_id, user_id) values ('document_download', doc_id, auth.uid());
end;
$$ language plpgsql security definer;

create or replace function increment_topic_views(topic_id uuid)
returns void as $$
begin
  update forum_topics set views_count = views_count + 1 where id = topic_id;
  insert into content_events (event_type, target_id, user_id) values ('topic_view', topic_id, auth.uid());
end;
$$ language plpgsql security definer;
