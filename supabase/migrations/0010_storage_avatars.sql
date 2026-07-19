-- Bucket de stockage pour les avatars (Annexe A.1, onboarding étape 4 + Annexe D.6, paramètres) —
-- jamais évoqué dans le schéma SQL du document de conception (§4), qui ne couvre que les tables
-- Postgres, pas la configuration storage-api. Convention de chemin : {user_id}/{filename}, pour que
-- la policy restreigne l'écriture au dossier de l'utilisateur courant sans table de mapping séparée.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatar images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "users upload their own avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users update their own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users delete their own avatar"
  on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
