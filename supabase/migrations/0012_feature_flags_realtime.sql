-- §5 (gouvernance des flags) : useFeatureFlag() doit s'abonner aux changements via Supabase
-- Realtime (postgres_changes) pour une mise à jour sans rechargement de page. La publication
-- supabase_realtime existe (créée par le déploiement Supabase) mais ne contenait aucune table —
-- sans cet ajout, aucun événement n'est jamais émis, silencieusement.

alter publication supabase_realtime add table feature_flags;
