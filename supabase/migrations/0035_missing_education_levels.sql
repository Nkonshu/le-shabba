-- Gap réel trouvé en préparant des données de test : seuls Côte d'Ivoire et Cameroun avaient des
-- niveaux scolaires (§4.1/0001, seed volontairement partiel — "à compléter pour les autres pays").
-- Bénin, Togo, Sénégal et France avaient zéro niveau, ce qui bloque totalement l'onboarding (Annexe
-- A.1) pour n'importe quel élève de ces pays : le select de niveau reste vide et affiche
-- "Ton pays n'est pas encore configuré, contacte-nous."

-- Bénin, Togo : système similaire à la Côte d'Ivoire (séries C/D).
insert into education_levels (country_id, label, sort_order)
select id, unnest(array['3ème','2nde','1ère D','1ère C','Terminale D','Terminale C']), generate_series(1, 6)
from countries where code = 'BJ';

insert into education_levels (country_id, label, sort_order)
select id, unnest(array['3ème','2nde','1ère D','1ère C','Terminale D','Terminale C']), generate_series(1, 6)
from countries where code = 'TG';

-- Sénégal : séries S/L (mentionné explicitement en exemple à l'Annexe A.1 du document).
insert into education_levels (country_id, label, sort_order)
select id, unnest(array['3ème','2nde','1ère S','1ère L','Terminale S','Terminale L']), generate_series(1, 6)
from countries where code = 'SN';

-- France : système post-réforme 2021, pas de filière C/D/S/L à ce niveau.
insert into education_levels (country_id, label, sort_order)
select id, unnest(array['3ème','2nde','1ère','Terminale']), generate_series(1, 4)
from countries where code = 'FR';
