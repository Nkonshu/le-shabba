-- Bucket de stockage pour les fichiers de documents (Annexe A.2/D.1) — comme pour les avatars
-- (0010), jamais couvert par le schéma SQL du document (§4), qui ne traite que Postgres.
-- Chemin : {author_id}/{timestamp}-{filename}. L'upload est restreint au staff en Phase 0 (cf. 0013),
-- mais les policies update/delete restent scopées par propriétaire (`owner`) pour ne pas devoir être
-- réécrites à l'ouverture communautaire de la Phase 1.

insert into storage.buckets (id, name, public, file_size_limit)
values ('documents', 'documents', true, 10485760)
on conflict (id) do nothing;

create policy "documents are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'documents');

create policy "staff uploads documents (phase 0)"
  on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin'))
  );

create policy "owner or staff updates document files"
  on storage.objects for update
  using (
    bucket_id = 'documents'
    and (owner = auth.uid() or exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin')))
  );

create policy "owner or staff deletes document files"
  on storage.objects for delete
  using (
    bucket_id = 'documents'
    and (owner = auth.uid() or exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin')))
  );
