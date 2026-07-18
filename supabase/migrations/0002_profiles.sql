-- §4.2 Profils + journal d'audit admin + suspension/bannissement (migré tôt, réutilisé par toutes les
-- sections suivantes qui vérifient un rôle ou un bannissement).

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  country_id uuid references countries(id),
  level_id uuid references education_levels(id),
  avatar_url text,
  bio text,
  locale text not null default 'fr' check (locale in ('fr','en')),
  genie_points int not null default 0,
  role text not null default 'student' check (role in ('student','admin','super_admin')),
  is_banned boolean not null default false,
  ban_reason text,
  banned_until timestamptz,  -- null + is_banned=true = bannissement permanent ; date future = suspension temporaire
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles are publicly readable"
  on profiles for select using (true);

create policy "users update their own profile, not sensitive fields"
  on profiles for update using (auth.uid() = id);

-- GRANT au niveau colonne plutôt qu'un trigger BEFORE UPDATE (qui ne protège rien en pratique, cf. document
-- §4.2) : un utilisateur authentifié ne peut modifier que ces colonnes via un .update() client.
revoke update on profiles from authenticated;
grant update (full_name, avatar_url, bio, locale) on profiles to authenticated;

-- Journal d'audit général des actions admin sensibles.
create table admin_actions_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references profiles(id),
  action text not null,  -- 'ban_user_permanent','ban_user_temporary','unban_user','change_role','confirm_payment','reject_payment','resolve_flag',...
  target_type text,
  target_id uuid,
  note text,
  created_at timestamptz not null default now()
);
alter table admin_actions_log enable row level security;
create policy "journal admin visible par staff" on admin_actions_log for select using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin'))
);
-- ⚠️ Étendu en §4.9 (colonne school_id + policy remplacée) quand les Espaces École seront migrés (Phase 5) —
-- pas possible ici, `schools` n'existe pas encore à ce stade.

create or replace function admin_set_user_role(target_user uuid, new_role text)
returns void as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and role = 'super_admin') then
    raise exception 'Seul un super_admin peut changer un rôle';
  end if;
  if new_role = 'super_admin' then
    raise exception 'La promotion en super_admin ne passe pas par cette fonction';
  end if;
  update profiles set role = new_role where id = target_user;
  insert into admin_actions_log (actor_id, action, target_type, target_id, note)
  values (auth.uid(), 'change_role', 'user', target_user, 'nouveau rôle : ' || new_role);
end;
$$ language plpgsql security definer;

-- Un compte is_banned=true reste bloqué en écriture indéfiniment SAUF si banned_until est fixé et dépassé —
-- centralise la logique ici plutôt que de la dupliquer dans chaque policy qui vérifierait is_banned nu.
create or replace function is_currently_banned(uid uuid)
returns boolean as $$
  select coalesce(
    (select is_banned and (banned_until is null or banned_until > now()) from profiles where id = uid),
    false
  );
$$ language sql stable;

create or replace function admin_ban_user(target_user uuid, reason text, duration_days int default null)
returns void as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin')) then
    raise exception 'Seul un admin ou super_admin peut suspendre/bannir';
  end if;
  if exists (select 1 from profiles where id = target_user and role = 'super_admin') then
    raise exception 'Un super_admin ne peut pas être banni';
  end if;
  update profiles set
    is_banned = true,
    ban_reason = reason,
    banned_until = case when duration_days is null then null else now() + (duration_days || ' days')::interval end
  where id = target_user;
  insert into admin_actions_log (actor_id, action, target_type, target_id, note)
  values (auth.uid(), case when duration_days is null then 'ban_user_permanent' else 'ban_user_temporary' end, 'user', target_user, reason);
end;
$$ language plpgsql security definer;

create or replace function admin_unban_user(target_user uuid)
returns void as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin')) then
    raise exception 'Seul un admin ou super_admin peut débannir';
  end if;
  update profiles set is_banned = false, ban_reason = null, banned_until = null where id = target_user;
  insert into admin_actions_log (actor_id, action, target_type, target_id)
  values (auth.uid(), 'unban_user', 'user', target_user);
end;
$$ language plpgsql security definer;
