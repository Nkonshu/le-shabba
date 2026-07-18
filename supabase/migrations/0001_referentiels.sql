-- §4.1 Référentiels pays / systèmes éducatifs
-- Application bilingue français/anglais dès le lancement (interface uniquement, §1.1).

create table countries (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,        -- 'CI', 'BJ', 'TG', 'SN', 'CM', 'FR'
  name text not null
);

create table education_levels (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null references countries(id),
  label text not null,               -- ex: 'Terminale D' (CI/BJ/CM francophone), 'Terminale S' (SN), 'Upper Sixth' (CM anglophone)
  sort_order int not null
);

create index on education_levels (country_id);

-- Seed minimal (à compléter pour les autres pays/filières du périmètre)
insert into countries (code, name) values
  ('CI', 'Côte d''Ivoire'), ('BJ', 'Bénin'), ('TG', 'Togo'),
  ('SN', 'Sénégal'), ('CM', 'Cameroun'), ('FR', 'France');

-- Exemple pour CI (à dupliquer avec les bons libellés par pays)
insert into education_levels (country_id, label, sort_order)
select id, unnest(array['3ème','2nde','1ère D','1ère C','Terminale D','Terminale C']), generate_series(1,6)
from countries where code = 'CI';

-- Exemple pour la filière anglophone du Cameroun (même country_id 'CM', filière distincte de la filière francophone)
insert into education_levels (country_id, label, sort_order)
select id, unnest(array['Form 3','Form 4','Form 5','Lower Sixth','Upper Sixth']), generate_series(7,11)
from countries where code = 'CM';
