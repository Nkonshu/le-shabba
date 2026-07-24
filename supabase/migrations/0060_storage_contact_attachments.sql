-- Bucket pour les pièces jointes du formulaire de contact — même traitement que bug-screenshots
-- (0018) : privé, un message et sa pièce jointe ne doivent être visibles que par son auteur (s'il
-- est connecté) ou le staff, comme la policy de select sur contact_messages.

insert into storage.buckets (id, name, public, file_size_limit)
values ('contact-attachments', 'contact-attachments', false, 10485760)
on conflict (id) do nothing;

create policy "anyone uploads a contact attachment, even anonymously"
  on storage.objects for insert
  with check (bucket_id = 'contact-attachments');

create policy "owner or staff views contact attachments"
  on storage.objects for select
  using (
    bucket_id = 'contact-attachments'
    and (
      (auth.uid() is not null and (storage.foldername(name))[1] = auth.uid()::text)
      or exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin'))
    )
  );
