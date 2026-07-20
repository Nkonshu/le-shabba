-- Espaces pub / partenariats sponsorisés (monetization.ads) — table gérée uniquement par le staff
-- (RLS staff-only, comme reference-data), servie aux visiteurs via une fonction security definer
-- qui applique le ciblage et compte les vues, jamais par une lecture directe de la table.
create table sponsored_slots (
  id uuid primary key default gen_random_uuid(),
  partner_name text not null,
  title text not null,
  body text,
  link_url text not null,
  image_url text,
  placement text not null check (placement in ('home_feed', 'subject')),
  subject text,  -- uniquement pertinent si placement = 'subject' ; matche documents.subject
  country_codes text[],           -- null = tous pays ; sinon matche countries.code
  education_level_ids uuid[],     -- null = tous niveaux ; sinon matche profiles.level_id
  languages text[] check (languages is null or languages <@ array['fr', 'en']),
  min_genie_points int,           -- null = pas de seuil d'engagement
  active boolean not null default true,
  starts_at date,
  ends_at date,
  impressions_count int not null default 0,
  clicks_count int not null default 0,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

alter table sponsored_slots enable row level security;

create policy "partenariats gérés par le staff" on sponsored_slots for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'super_admin'))
) with check (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'super_admin'))
);

-- Sélectionne au plus une annonce active correspondant au placement/ciblage, jamais pour un compte
-- premium ou membre d'une école (elles ont déjà payé pour un espace "propre"). Incrémente le
-- compteur de vues au passage — un appel unique, pas d'aller-retour séparé pour l'impression.
-- p_locale vient de la locale de la page (fr/en), disponible même pour un visiteur non connecté ;
-- les autres critères (pays/niveau/points) nécessitent un profil et sont ignorés pour un anonyme.
create or replace function get_sponsored_slot(p_placement text, p_locale text, p_subject text default null)
returns table (id uuid, partner_name text, title text, body text, link_url text, image_url text)
language plpgsql security definer as $$
declare
  v_profile record;
  v_slot_id uuid;
begin
  if auth.uid() is not null then
    select is_premium, country_id, level_id, genie_points into v_profile
    from profiles where profiles.id = auth.uid();

    if v_profile.is_premium then
      return;
    end if;
    if exists (select 1 from school_memberships where user_id = auth.uid()) then
      return;
    end if;
  end if;

  select s.id into v_slot_id
  from sponsored_slots s
  where s.active
    and s.placement = p_placement
    and (p_subject is null or s.subject is null or s.subject = p_subject)
    and (s.starts_at is null or s.starts_at <= current_date)
    and (s.ends_at is null or s.ends_at >= current_date)
    and (s.languages is null or p_locale = any(s.languages))
    and (
      s.country_codes is null or (
        auth.uid() is not null
        and exists (select 1 from countries c where c.id = v_profile.country_id and c.code = any(s.country_codes))
      )
    )
    and (
      s.education_level_ids is null or (auth.uid() is not null and v_profile.level_id = any(s.education_level_ids))
    )
    and (
      s.min_genie_points is null or (auth.uid() is not null and v_profile.genie_points >= s.min_genie_points)
    )
  order by random()
  limit 1;

  if v_slot_id is null then
    return;
  end if;

  update sponsored_slots set impressions_count = impressions_count + 1 where sponsored_slots.id = v_slot_id;

  return query
    select s.id, s.partner_name, s.title, s.body, s.link_url, s.image_url
    from sponsored_slots s where s.id = v_slot_id;
end;
$$;

-- Appelée par la route de clic (/api/ads/[slotId]/click) juste avant de rediriger vers link_url.
create or replace function record_sponsored_click(p_slot_id uuid)
returns text
language plpgsql security definer as $$
declare
  v_url text;
begin
  update sponsored_slots set clicks_count = clicks_count + 1
  where id = p_slot_id
  returning link_url into v_url;
  return v_url;
end;
$$;
