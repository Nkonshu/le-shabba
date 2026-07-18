-- §4.3 Documents (cours / épreuves / corrigés / fiches) + reprise de lecture

create table documents (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles(id),
  title text not null,
  type text not null check (type in ('Cours','Épreuve','Corrigé','Fiche de révision')),
  related_document_id uuid references documents(id),  -- pour un Corrigé : l'Épreuve qu'il corrige
  level_id uuid references education_levels(id),
  subject text not null,
  year text,
  country_id uuid references countries(id),
  establishment text,
  exam_type text,
  file_url text not null,
  rights_certified boolean not null default false,   -- case "je certifie être autorisé à partager ceci", obligatoire
  status text not null default 'unverified'
    check (status in ('unverified','community_verified','staff_verified','flagged','removed')),
  votes_count int not null default 0,
  views_count int not null default 0,   -- alimente "les plus lus" sur l'accueil (Annexe C.4)
  created_at timestamptz not null default now()
);

alter table documents enable row level security;

create policy "documents visible sauf removed"
  on documents for select using (status <> 'removed' or author_id = auth.uid());

create policy "utilisateur non banni peut publier, droits certifiés"
  on documents for insert
  with check (
    auth.uid() = author_id
    and rights_certified = true
    and not is_currently_banned(auth.uid())
  );

create policy "auteur ou staff peut modifier/supprimer"
  on documents for update using (
    author_id = auth.uid()
    or exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin'))
  );

create policy "auteur ou staff peut supprimer"
  on documents for delete using (
    author_id = auth.uid()
    or exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin'))
  );

create table document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  editor_id uuid not null references profiles(id),
  diff_summary text,
  previous_file_url text,
  created_at timestamptz not null default now()
);
alter table document_versions enable row level security;
create policy "historique visible par tous" on document_versions for select using (true);
create policy "genie_points >= 3500 peut éditer autrui"
  on document_versions for insert
  with check (
    editor_id = auth.uid()
    and exists (select 1 from profiles where id = auth.uid() and genie_points >= 3500)
  );

-- Appelée à l'ouverture d'un document dans le DocumentReader (Annexe A.14)
create or replace function increment_document_views(doc_id uuid)
returns void as $$
begin
  update documents set views_count = views_count + 1 where id = doc_id;
end;
$$ language plpgsql security definer;

-- "Reprise de lecture" (Annexe A.14) : une ligne par (utilisateur, document), mise à jour par upsert à
-- chaque changement de page — synchronisée entre appareils, contrairement à un localStorage.
create table document_reading_progress (
  user_id uuid not null references profiles(id) on delete cascade,
  document_id uuid not null references documents(id) on delete cascade,
  last_page int not null default 1,
  updated_at timestamptz not null default now(),
  primary key (user_id, document_id)
);
alter table document_reading_progress enable row level security;
create policy "utilisateur consulte sa propre progression" on document_reading_progress
  for select using (auth.uid() = user_id);
create policy "utilisateur upsert sa propre progression" on document_reading_progress
  for insert with check (auth.uid() = user_id);
create policy "utilisateur met à jour sa propre progression" on document_reading_progress
  for update using (auth.uid() = user_id);
