-- Faille trouvée en construisant le CRUD admin pour ces listes : RLS n'était tout simplement jamais
-- activé sur countries/education_levels depuis leur création (0001) — n'importe qui, même sans
-- authentification (clé anon seule), pouvait insérer/modifier/supprimer ces lignes de référence
-- directement via l'API REST. Vérifié avant correction : un insert anonyme est passé (201).
alter table countries enable row level security;
alter table education_levels enable row level security;

create policy "pays lisible par tous" on countries for select using (true);
create policy "pays géré par le staff" on countries for insert with check (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin'))
);
create policy "pays modifiable par le staff" on countries for update using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin'))
);
create policy "pays supprimable par le staff" on countries for delete using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin'))
);

create policy "niveaux lisibles par tous" on education_levels for select using (true);
create policy "niveaux gérés par le staff" on education_levels for insert with check (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin'))
);
create policy "niveaux modifiables par le staff" on education_levels for update using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin'))
);
create policy "niveaux supprimables par le staff" on education_levels for delete using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin'))
);
