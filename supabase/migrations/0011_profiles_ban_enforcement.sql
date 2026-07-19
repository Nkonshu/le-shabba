-- §3 (conventions) : "pas de vérification de rôle admin/ban côté client uniquement" — la policy
-- d'update posée en 0002 ne vérifiait que la propriété (auth.uid() = id), jamais le bannissement.
-- Un compte banni pouvait donc modifier son profil via un appel direct à l'API malgré la règle
-- métier de l'Annexe A.1 ("toute action d'écriture est bloquée"). is_currently_banned() existe
-- déjà (0002) mais n'était câblée dans aucune policy.

drop policy "users update their own profile, not sensitive fields" on profiles;

create policy "users update their own profile, not sensitive fields"
  on profiles for update
  using (auth.uid() = id and not is_currently_banned(id));
