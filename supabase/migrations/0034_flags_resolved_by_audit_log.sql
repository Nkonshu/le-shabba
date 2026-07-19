-- Bug réel trouvé en test bout-en-bout (introduit par cette session, pas hérité des phases
-- précédentes) : le Panthéon "Éditeurs" (0031) compte `admin_actions_log` où `action='resolve_flag'`
-- en approximation des modérateurs actifs — mais `resolve_flag()` (0022) n'a jamais écrit dans
-- `admin_actions_log`, contrairement à `admin_ban_user`/`admin_set_user_role` (§4.2) qui, eux,
-- journalisent systématiquement. Conséquence : la catégorie "Éditeurs" est vide à vie, aucune
-- donnée ne peut jamais y apparaître. `flags` n'avait pas non plus de colonne pour savoir QUI a
-- traité un signalement donné — ajoutée ici pour la même occasion.
alter table flags add column resolved_by uuid references profiles(id);

create or replace function resolve_flag(flag_id_param uuid, action text)
returns void as $$
declare
  v_flag record;
  v_content_author uuid;
begin
  if action not in ('confirm', 'dismiss') then
    raise exception 'Action invalide';
  end if;

  select * into v_flag from flags where id = flag_id_param;
  if v_flag is null then
    raise exception 'Signalement introuvable';
  end if;

  if not exists (
    select 1 from profiles
    where id = auth.uid() and (genie_points >= 3500 or role in ('admin','super_admin'))
  ) then
    raise exception 'Il faut au moins 3500 points de génie (ou être staff) pour traiter un signalement';
  end if;

  if v_flag.target_type = 'document' then
    select author_id into v_content_author from documents where id = v_flag.target_id;
  elsif v_flag.target_type = 'topic' then
    select author_id into v_content_author from forum_topics where id = v_flag.target_id;
  elsif v_flag.target_type = 'answer' then
    select author_id into v_content_author from forum_answers where id = v_flag.target_id;
  elsif v_flag.target_type = 'user' then
    v_content_author := v_flag.target_id;
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
    -- user/tutoring_session : jamais d'action automatique (§4.6), seulement l'examen humain ci-dessus.
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

  insert into admin_actions_log (actor_id, action, target_type, target_id, note)
  values (auth.uid(), 'resolve_flag', v_flag.target_type, v_flag.target_id, action || ' : ' || v_flag.reason);

  if v_content_author is not null then
    insert into notifications (user_id, type, target_id, payload)
    values (
      v_content_author, 'flag_resolved', v_flag.target_id,
      jsonb_build_object('action', action, 'reason', v_flag.reason, 'target_type', v_flag.target_type)
    );
  end if;
end;
$$ language plpgsql security definer;
