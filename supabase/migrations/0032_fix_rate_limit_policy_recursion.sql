-- Bug réel trouvé en test bout-en-bout (pré-existant, indépendant de la Phase 2) : le rate-limiting
-- "comptes < 48h" (Annexe A.5, migration 0021) inclut un sous-select sur la MÊME table dans la clause
-- WITH CHECK de sa propre policy d'INSERT (`select count(*) from forum_answers a where ...`, idem pour
-- documents). Postgres refuse ce schéma : évaluer ce sous-select réapplique les policies RLS de la
-- table alors que Postgres est déjà en train d'en résoudre une pour cette même table — il détecte la
-- réentrance et lève 42P17 "infinite recursion detected in policy" (un garde-fou structurel, pas une
-- vraie boucle infinie liée au contenu des lignes). Conséquence en pratique : PERSONNE ne pouvait
-- publier de réponse au forum ni de document, tout le temps (pas seulement les nouveaux comptes visés
-- par la limite) — un blocage total du contenu depuis la migration 0021, jamais détecté faute de test
-- bout-en-bout avec un compte non-staff avant cette session.
--
-- Correctif standard : déplacer le comptage dans une fonction plpgsql séparée. Contrairement à une
-- fonction `language sql` simple (que le planificateur peut « inliner », recréant le même problème),
-- une fonction plpgsql n'est jamais inlinée — elle s'exécute via un appel SPI distinct, hors du contexte
-- de réécriture de la policy en cours, ce qui évite la détection de réentrance.
create or replace function count_recent_forum_answers(target_user uuid)
returns bigint as $$
begin
  return (select count(*) from forum_answers where author_id = target_user and created_at > now() - interval '48 hours');
end;
$$ language plpgsql stable security definer;

create or replace function count_recent_documents(target_user uuid)
returns bigint as $$
begin
  return (select count(*) from documents where author_id = target_user and created_at > now() - interval '48 hours');
end;
$$ language plpgsql stable security definer;

drop policy "auteur non banni peut répondre à un sujet ouvert" on forum_answers;
create policy "auteur non banni peut répondre à un sujet ouvert"
  on forum_answers for insert
  with check (
    auth.uid() = author_id
    and not is_currently_banned(auth.uid())
    and exists (select 1 from forum_topics where id = topic_id and status = 'open')
    and (
      exists (select 1 from profiles where id = auth.uid() and created_at < now() - interval '48 hours')
      or count_recent_forum_answers(auth.uid()) < 5
    )
  );

drop policy "utilisateur non banni peut publier, droits certifiés" on documents;
create policy "utilisateur non banni peut publier, droits certifiés"
  on documents for insert
  with check (
    auth.uid() = author_id
    and rights_certified = true
    and not is_currently_banned(auth.uid())
    and (
      exists (select 1 from profiles where id = auth.uid() and created_at < now() - interval '48 hours')
      or count_recent_documents(auth.uid()) < 3
    )
  );
