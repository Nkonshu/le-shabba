-- §4.9 Espaces École — multi-tenance (façon Stack Overflow for Teams). Réputation (genie_points)
-- reste globale, partagée entre espace école et plateforme publique (§3.4 conception produit).

create table schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country_id uuid references countries(id),
  subdomain text unique,              -- ex: 'lycee-x' — routage par chemin pour l'instant (/ecole/lycee-x),
                                       -- basculera en sous-domaine (lycee-x.le-shabba.fr) une fois le DNS
                                       -- wildcard posé côté Cloudflare (annexe E, à venir).
  plan text not null default 'trial' check (plan in ('trial','standard','premium')),
  max_seats int not null default 50,
  created_at timestamptz not null default now()
);
alter table schools enable row level security;

create table school_memberships (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('member','school_moderator','school_admin')),
  -- Permissions à la carte : ne s'applique qu'à role='school_moderator' — un school_admin a toujours
  -- l'intégralité des droits, quel que soit le contenu de cette colonne (jamais vérifiée pour lui).
  permissions jsonb not null default '{"documents": true, "forum": true}'::jsonb,
  created_at timestamptz not null default now(),
  unique (school_id, user_id)
);
alter table school_memberships enable row level security;
create policy "membership visible par les membres de la même école" on school_memberships for select using (
  exists (select 1 from school_memberships sm where sm.school_id = school_memberships.school_id and sm.user_id = auth.uid())
);

-- Posée après school_memberships (référencée dedans) — schools et school_memberships sont créées d'un
-- bloc avant que quoi que ce soit ne les référence.
create policy "école visible par ses membres et le staff plateforme" on schools for select using (
  exists (select 1 from school_memberships where school_id = schools.id and user_id = auth.uid())
  or exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin'))
);

-- Demande de création d'école (Annexe A.10) : validation manuelle par l'équipe avant activation, pas
-- d'auto-provisioning en libre-service au lancement (sous-domaines fantaisistes/frauduleux).
create table school_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references profiles(id),
  school_name text not null,
  country_id uuid references countries(id),
  estimated_students int,
  desired_subdomain text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz
);
alter table school_requests enable row level security;
create policy "demande visible par son auteur et le staff" on school_requests for select using (
  requester_id = auth.uid() or exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin'))
);
create policy "utilisateur crée sa propre demande d'école" on school_requests for insert with check (requester_id = auth.uid());
create policy "seul le staff traite une demande d'école" on school_requests for update using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin'))
);

-- Approbation : crée l'école + rend le demandeur school_admin — décrit en prose à l'Annexe A.10
-- ("Une fois validée : schools.plan = 'trial', le demandeur devient school_admin") sans qu'aucune
-- fonction ne l'implémente dans le document ; ajoutée ici pour que le flux soit réellement exécutable.
create or replace function approve_school_request(request_id uuid)
returns uuid as $$
declare
  v_request record;
  v_school_id uuid;
begin
  if not exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin')) then
    raise exception 'Seul le staff plateforme peut valider une demande d''école';
  end if;

  select * into v_request from school_requests where id = request_id and status = 'pending';
  if v_request is null then
    raise exception 'Demande introuvable ou déjà traitée';
  end if;

  insert into schools (name, country_id, subdomain, plan)
  values (v_request.school_name, v_request.country_id, v_request.desired_subdomain, 'trial')
  returning id into v_school_id;

  insert into school_memberships (school_id, user_id, role) values (v_school_id, v_request.requester_id, 'school_admin');

  update school_requests set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now() where id = request_id;
  insert into admin_actions_log (actor_id, action, target_type, target_id, school_id)
  values (auth.uid(), 'approve_school_request', 'school_request', request_id, v_school_id);

  return v_school_id;
end;
$$ language plpgsql security definer;

create or replace function reject_school_request(request_id uuid)
returns void as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin')) then
    raise exception 'Seul le staff plateforme peut traiter une demande d''école';
  end if;
  update school_requests set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now()
    where id = request_id and status = 'pending';
end;
$$ language plpgsql security definer;
