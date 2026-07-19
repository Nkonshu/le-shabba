-- Extension des tables de contenu existantes (§4.9) — une seule colonne ajoutée, nullable : null =
-- contenu public global, comportement inchangé pour tout ce qui existe déjà.
alter table documents add column school_id uuid references schools(id);
alter table forum_topics add column school_id uuid references schools(id);
alter table forum_answers add column school_id uuid references schools(id);

-- Colonnes support du bandeau "Modéré par [rôle]" (Annexe C.17) — jusqu'ici cette mention était décrite
-- en prose sans qu'aucune colonne ne permette de savoir qui a réellement modifié le contenu d'un tiers.
alter table documents add column last_moderated_by uuid references profiles(id);
alter table documents add column last_moderated_at timestamptz;
alter table forum_topics add column last_moderated_by uuid references profiles(id);
alter table forum_topics add column last_moderated_at timestamptz;
-- forum_answers a déjà last_moderated_by/last_moderated_at (migration 0004) — rien à ajouter ici.

alter table admin_actions_log add column school_id uuid references schools(id);

drop policy "journal admin visible par staff" on admin_actions_log;
create policy "journal visible par le staff plateforme ou le mini-admin de l'école concernée"
  on admin_actions_log for select using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin'))
    or (
      school_id is not null
      and exists (
        select 1 from school_memberships
        where school_id = admin_actions_log.school_id and user_id = auth.uid() and role in ('school_admin','school_moderator')
      )
    )
  );
