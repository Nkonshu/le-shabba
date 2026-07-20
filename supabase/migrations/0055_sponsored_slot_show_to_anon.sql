-- Un visiteur non connecté ne peut pas être filtré par pays/niveau/points (on ne connaît rien de
-- lui) — jusqu'ici il était de fait EXCLU dès qu'un seul de ces critères était renseigné, ce qui
-- réduit fortement les vues réelles pour tout le trafic pas encore inscrit. Nouveau comportement :
-- ces trois critères sont ignorés pour un anonyme (il voit l'annonce comme si le critère n'existait
-- pas) plutôt que de l'exclure ; seuls la langue (connue via la locale de la page) et les
-- dates/actif restent appliqués. Le comptage des vues (impressions_count) suit mécaniquement,
-- puisqu'il s'incrémente à chaque annonce effectivement retournée, connecté ou non.
create or replace function get_sponsored_slot(p_placement text, p_locale text, p_subject text default null)
returns table (id uuid, partner_name text, title text, body text, link_url text, image_url text)
language plpgsql security definer as $$
declare
  v_is_premium boolean;
  v_country_id uuid;
  v_level_id uuid;
  v_genie_points int;
  v_slot_id uuid;
begin
  if auth.uid() is not null then
    select p.is_premium, p.country_id, p.level_id, p.genie_points
    into v_is_premium, v_country_id, v_level_id, v_genie_points
    from profiles p where p.id = auth.uid();

    if v_is_premium then
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
      s.country_codes is null or auth.uid() is null
      or exists (select 1 from countries c where c.id = v_country_id and c.code = any(s.country_codes))
    )
    and (
      s.education_level_ids is null or auth.uid() is null or v_level_id = any(s.education_level_ids)
    )
    and (
      s.min_genie_points is null or auth.uid() is null or v_genie_points >= s.min_genie_points
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
