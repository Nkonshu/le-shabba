-- Annexe A.5 : "Modale : motif obligatoire + commentaire libre optionnel" — la table `flags` (0006)
-- n'avait jamais de colonne pour ce commentaire libre.
alter table flags add column note text;
