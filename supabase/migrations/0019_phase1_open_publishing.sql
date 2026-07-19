-- Phase 1 (§9) : "Ouvrir l'upload de documents à tout utilisateur non banni" — lève la restriction
-- admin-only posée en 0013 pour le lancement initial (Phase 0). rights_certified reste obligatoire.

drop policy "admin-only upload for phase 0 launch" on documents;

create policy "utilisateur non banni peut publier, droits certifiés"
  on documents for insert
  with check (
    auth.uid() = author_id
    and rights_certified = true
    and not is_currently_banned(auth.uid())
  );

-- Même ouverture côté storage (0014 restreignait l'upload de fichiers au staff).
drop policy "staff uploads documents (phase 0)" on storage.objects;

create policy "non-banned users upload documents (phase 1)"
  on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and auth.uid() is not null
    and not is_currently_banned(auth.uid())
  );
