-- §4.12 : bucket pour les captures d'écran jointes à un signalement d'anomalie — jamais couvert par
-- le schéma SQL du document (§4), qui ne traite que Postgres. Contrairement aux avatars/documents,
-- ce bucket n'est PAS public : un signalement (et sa capture) ne doit être visible que par son
-- auteur (s'il est connecté) ou le staff, comme le fait déjà la policy de select sur bug_reports.

insert into storage.buckets (id, name, public, file_size_limit)
values ('bug-screenshots', 'bug-screenshots', false, 10485760)
on conflict (id) do nothing;

create policy "anyone uploads a bug screenshot, even anonymously"
  on storage.objects for insert
  with check (bucket_id = 'bug-screenshots');

create policy "owner or staff views bug screenshots"
  on storage.objects for select
  using (
    bucket_id = 'bug-screenshots'
    and (
      (auth.uid() is not null and (storage.foldername(name))[1] = auth.uid()::text)
      or exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin'))
    )
  );
