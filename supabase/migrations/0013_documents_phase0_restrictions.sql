-- Phase 0 (§9) : "bibliothèque de documents en mode admin-only pour ce lancement initial (upload
-- réservé aux rôles admin/super_admin)" — décision de rollout produit délibérée, l'ouverture
-- communautaire arrive en Phase 1 ("Ouvrir l'upload de documents à tout utilisateur non banni").
-- La policy d'insert migrée en 0003 n'appliquait aucune restriction de rôle — §3 : jamais une
-- restriction de ce type laissée au seul masquage du bouton côté UI.

drop policy "utilisateur non banni peut publier, droits certifiés" on documents;

create policy "admin-only upload for phase 0 launch"
  on documents for insert
  with check (
    auth.uid() = author_id
    and rights_certified = true
    and not is_currently_banned(auth.uid())
    and exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin'))
  );
