-- Bug réel trouvé en test bout-en-bout, hérité tel quel du document (§4.9) : la policy SELECT de
-- school_memberships se référence elle-même dans sa propre clause USING
-- (`exists (select 1 from school_memberships sm where ...)`) — exactement le même schéma que le bug
-- corrigé en 0032 (rate-limiting) : Postgres refuse catégoriquement d'évaluer une policy qui
-- redemande les policies de la même relation qu'elle est déjà en train de résoudre (42P17 "infinite
-- recursion detected in policy"). Conséquence : la moindre lecture de `schools` ou
-- `school_memberships` par qui que ce soit — y compris un simple membre consultant sa propre école —
-- échouait avec une erreur 500, rendant tout l'espace école inutilisable.
create or replace function is_member_of_school(target_school_id uuid, target_user uuid)
returns boolean as $$
begin
  return exists (
    select 1 from school_memberships where school_id = target_school_id and user_id = target_user
  );
end;
$$ language plpgsql stable security definer;

drop policy "membership visible par les membres de la même école" on school_memberships;
create policy "membership visible par les membres de la même école" on school_memberships for select using (
  is_member_of_school(school_id, auth.uid())
);
