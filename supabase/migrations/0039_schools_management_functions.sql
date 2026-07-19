-- §4.9 : partage vers la bibliothèque publique — seule action qui fait sortir un contenu de son
-- école, réservée aux school_admin/school_moderator, avec bonus de réputation.
create or replace function promote_document_to_public(doc_id uuid)
returns void as $$
declare
  v_school_id uuid;
  v_author uuid;
begin
  select school_id, author_id into v_school_id, v_author from documents where id = doc_id;

  if not exists (
    select 1 from school_memberships
    where school_id = v_school_id and user_id = auth.uid() and role in ('school_admin','school_moderator')
  ) then
    raise exception 'Seul un modérateur/admin de l''école peut partager vers le public';
  end if;

  update documents set school_id = null where id = doc_id;
  perform award_points(v_author, 30, 'partage_public');
end;
$$ language plpgsql security definer;

-- Nomination d'un modérateur d'école, permissions à la carte (documents/forum).
create or replace function set_school_member_role(
  target_school_id uuid, target_user uuid, new_role text, new_permissions jsonb default null
)
returns void as $$
begin
  if new_role not in ('member', 'school_moderator') then
    raise exception 'Cette fonction ne gère que member/school_moderator, pas school_admin (voir promote_to_school_admin)';
  end if;
  if not exists (
    select 1 from school_memberships
    where school_id = target_school_id and user_id = auth.uid() and role = 'school_admin'
  ) then
    raise exception 'Seul le school_admin de cette école peut désigner un modérateur';
  end if;
  update school_memberships set
    role = new_role,
    permissions = case
      when new_role = 'school_moderator' then coalesce(new_permissions, '{"documents": true, "forum": true}'::jsonb)
      else permissions
    end
    where school_id = target_school_id and user_id = target_user;
  insert into admin_actions_log (actor_id, action, target_type, target_id, school_id, note)
  values (auth.uid(), 'change_role_school', 'user', target_user, target_school_id, 'nouveau rôle : ' || new_role);
end;
$$ language plpgsql security definer;

-- Succession : plusieurs school_admin possibles par école (corrige le "bus factor" d'un seul admin).
create or replace function promote_to_school_admin(target_school_id uuid, target_user uuid)
returns void as $$
declare
  v_is_staff boolean;
begin
  v_is_staff := exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin'));
  if not v_is_staff and not exists (
    select 1 from school_memberships
    where school_id = target_school_id and user_id = auth.uid() and role = 'school_admin'
  ) then
    raise exception 'Seul un school_admin de cette école (ou le staff plateforme) peut nommer un co-administrateur';
  end if;
  update school_memberships set role = 'school_admin'
    where school_id = target_school_id and user_id = target_user;
  insert into admin_actions_log (actor_id, action, target_type, target_id, school_id, note)
  values (auth.uid(), 'promote_school_admin', 'user', target_user, target_school_id,
    case when v_is_staff then 'réassignation d''urgence par le staff plateforme' else null end);
end;
$$ language plpgsql security definer;

-- Retrait volontaire : jamais laisser une école sans aucun school_admin.
create or replace function step_down_school_admin(target_school_id uuid)
returns void as $$
begin
  if not exists (
    select 1 from school_memberships where school_id = target_school_id and user_id = auth.uid() and role = 'school_admin'
  ) then
    raise exception 'Tu n''es pas school_admin de cette école';
  end if;
  if (select count(*) from school_memberships where school_id = target_school_id and role = 'school_admin') <= 1 then
    raise exception 'Impossible : tu es le seul school_admin restant — nomme un co-administrateur avant de te retirer';
  end if;
  update school_memberships set role = 'school_moderator'
    where school_id = target_school_id and user_id = auth.uid();
  insert into admin_actions_log (actor_id, action, target_type, target_id, school_id)
  values (auth.uid(), 'step_down_school_admin', 'user', auth.uid(), target_school_id);
end;
$$ language plpgsql security definer;
