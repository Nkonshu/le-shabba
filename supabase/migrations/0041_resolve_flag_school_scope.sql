-- Complète le "Flux de modération scopée à l'école" (Annexe A.10) : le school_admin/school_moderator
-- voyait déjà les signalements de son école (0040) mais ne pouvait jamais les faire passer en
-- resolved/dismissed via resolve_flag (0022/0033/0034), qui exige encore >=3500 points de génie ou le
-- staff plateforme — contraire au principe explicite de l'Annexe A.10 : "son autorité vient du rôle
-- attribué localement, pas de sa réputation plateforme". Sans ce correctif, la file de modération école
-- affiche des signalements qu'aucun mini-admin ne peut jamais traiter.
create or replace function resolve_flag(flag_id_param uuid, action text)
returns void as $$
declare
  v_flag record;
  v_content_author uuid;
  v_school_id uuid;
  v_permission_key text;
  v_is_platform_authorized boolean;
  v_is_school_authorized boolean;
begin
  if action not in ('confirm', 'dismiss') then
    raise exception 'Action invalide';
  end if;

  select * into v_flag from flags where id = flag_id_param;
  if v_flag is null then
    raise exception 'Signalement introuvable';
  end if;

  if v_flag.target_type = 'document' then
    select author_id, school_id into v_content_author, v_school_id from documents where id = v_flag.target_id;
    v_permission_key := 'documents';
  elsif v_flag.target_type = 'topic' then
    select author_id, school_id into v_content_author, v_school_id from forum_topics where id = v_flag.target_id;
    v_permission_key := 'forum';
  elsif v_flag.target_type = 'answer' then
    select a.author_id, t.school_id into v_content_author, v_school_id
      from forum_answers a join forum_topics t on t.id = a.topic_id where a.id = v_flag.target_id;
    v_permission_key := 'forum';
  elsif v_flag.target_type = 'user' then
    v_content_author := v_flag.target_id;
  end if;

  v_is_platform_authorized := exists (
    select 1 from profiles where id = auth.uid() and (genie_points >= 3500 or role in ('admin','super_admin'))
  );
  v_is_school_authorized := v_school_id is not null and exists (
    select 1 from school_memberships
    where school_id = v_school_id and user_id = auth.uid()
    and (role = 'school_admin' or (role = 'school_moderator' and coalesce((permissions->>v_permission_key)::boolean, true)))
  );

  if not v_is_platform_authorized and not v_is_school_authorized then
    raise exception 'Il faut au moins 3500 points de génie (ou être staff/mini-admin de l''école) pour traiter un signalement';
  end if;

  if v_content_author = auth.uid() then
    raise exception 'Tu ne peux pas traiter un signalement sur ton propre contenu';
  end if;

  update flags set status = case when action = 'confirm' then 'resolved' else 'dismissed' end,
    resolved_by = auth.uid()
    where id = flag_id_param;

  if action = 'confirm' then
    if v_flag.target_type = 'document' then
      update documents set status = 'removed' where id = v_flag.target_id;
    elsif v_flag.target_type = 'topic' then
      update forum_topics set is_flagged = true where id = v_flag.target_id;
    elsif v_flag.target_type = 'answer' then
      update forum_answers set is_flagged = true where id = v_flag.target_id;
    end if;
  else
    if v_flag.target_type = 'document' then
      update documents set status = (case when votes_count >= 5 then 'community_verified' else 'unverified' end)
        where id = v_flag.target_id and status = 'flagged';
    elsif v_flag.target_type = 'topic' then
      update forum_topics set is_flagged = false where id = v_flag.target_id;
    elsif v_flag.target_type = 'answer' then
      update forum_answers set is_flagged = false where id = v_flag.target_id;
    end if;
  end if;

  insert into admin_actions_log (actor_id, action, target_type, target_id, school_id, note)
  values (auth.uid(), 'resolve_flag', v_flag.target_type, v_flag.target_id, v_school_id, action || ' : ' || v_flag.reason);

  if v_content_author is not null then
    insert into notifications (user_id, type, target_id, payload)
    values (
      v_content_author, 'flag_resolved', v_flag.target_id,
      jsonb_build_object('action', action, 'reason', v_flag.reason, 'target_type', v_flag.target_type)
    );
  end if;
end;
$$ language plpgsql security definer;
