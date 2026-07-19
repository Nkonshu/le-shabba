-- §4.2 fix découvert en construisant l'onboarding (Annexe A.1) : la migration 0002 n'avait ni policy
-- d'INSERT sur profiles (RLS bloque tout insert par défaut sans policy explicite — l'onboarding ne
-- pouvait pas créer la ligne de profil), ni le droit de modifier country_id/level_id en update (le
-- formulaire de paramètres, Annexe D.6, doit pourtant pouvoir changer pays/niveau après l'inscription).

create policy "users insert their own profile"
  on profiles for insert with check (auth.uid() = id);

grant update (country_id, level_id) on profiles to authenticated;
