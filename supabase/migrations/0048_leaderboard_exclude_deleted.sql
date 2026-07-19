-- Un compte supprimé (delete_own_account, 0047) reste en base anonymisé mais ne doit plus
-- apparaître dans le classement public — même logique que le filtre `not p.is_banned` déjà présent
-- ici, juste étendu à `deleted_at is null`.
create or replace function get_leaderboard(
  p_category text,
  p_window text default 'all',
  p_level_id uuid default null,
  p_country_id uuid default null,
  p_limit int default 50
)
returns table (
  user_id uuid,
  full_name text,
  avatar_url text,
  badges_bronze int,
  badges_argent int,
  badges_or int,
  current_streak int,
  metric bigint
) as $$
declare
  v_since timestamptz;
begin
  if p_category not in ('reputation', 'voters', 'editors', 'streaks') then
    raise exception 'catégorie de classement inconnue: %', p_category;
  end if;
  if p_window not in ('week', 'month', 'quarter', 'year', 'all') then
    raise exception 'fenêtre de classement inconnue: %', p_window;
  end if;

  v_since := case p_window
    when 'week' then now() - interval '7 days'
    when 'month' then now() - interval '1 month'
    when 'quarter' then now() - interval '3 months'
    when 'year' then now() - interval '1 year'
    else null
  end;

  if p_category = 'reputation' and p_window = 'all' then
    return query
      select p.id, p.full_name, p.avatar_url, p.badges_bronze, p.badges_argent, p.badges_or, p.current_streak,
             p.genie_points::bigint as metric
      from profiles p
      where not p.is_banned
        and p.deleted_at is null
        and (p_level_id is null or p.level_id = p_level_id)
        and (p_country_id is null or p.country_id = p_country_id)
      order by p.genie_points desc
      limit p_limit;

  elsif p_category = 'reputation' then
    return query
      select p.id, p.full_name, p.avatar_url, p.badges_bronze, p.badges_argent, p.badges_or, p.current_streak,
             sum(pl.amount)::bigint as metric
      from points_ledger pl
      join profiles p on p.id = pl.user_id
      where pl.created_at >= v_since
        and not p.is_banned
        and p.deleted_at is null
        and (p_level_id is null or p.level_id = p_level_id)
        and (p_country_id is null or p.country_id = p_country_id)
      group by p.id
      having sum(pl.amount) > 0
      order by metric desc
      limit p_limit;

  elsif p_category = 'voters' then
    return query
      select p.id, p.full_name, p.avatar_url, p.badges_bronze, p.badges_argent, p.badges_or, p.current_streak,
             count(v.id)::bigint as metric
      from votes v
      join profiles p on p.id = v.user_id
      where (v_since is null or v.created_at >= v_since)
        and not p.is_banned
        and p.deleted_at is null
        and (p_level_id is null or p.level_id = p_level_id)
        and (p_country_id is null or p.country_id = p_country_id)
      group by p.id
      order by metric desc
      limit p_limit;

  elsif p_category = 'editors' then
    return query
      select p.id, p.full_name, p.avatar_url, p.badges_bronze, p.badges_argent, p.badges_or, p.current_streak,
             count(a.id)::bigint as metric
      from admin_actions_log a
      join profiles p on p.id = a.actor_id
      where a.action = 'resolve_flag'
        and (v_since is null or a.created_at >= v_since)
        and not p.is_banned
        and p.deleted_at is null
        and (p_level_id is null or p.level_id = p_level_id)
        and (p_country_id is null or p.country_id = p_country_id)
      group by p.id
      order by metric desc
      limit p_limit;

  else
    return query
      select p.id, p.full_name, p.avatar_url, p.badges_bronze, p.badges_argent, p.badges_or, p.current_streak,
             p.current_streak::bigint as metric
      from profiles p
      where p.current_streak > 0
        and not p.is_banned
        and p.deleted_at is null
        and (p_level_id is null or p.level_id = p_level_id)
        and (p_country_id is null or p.country_id = p_country_id)
      order by p.current_streak desc
      limit p_limit;
  end if;
end;
$$ language plpgsql stable security definer set search_path = public;
