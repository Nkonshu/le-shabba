-- Bug réel trouvé en test bout-en-bout : la branche "confirm" de resolve_flag (0022) suppose que
-- is_flagged est "déjà" true pour un sujet/réponse au moment où le staff confirme un signalement —
-- vrai seulement si le seuil d'auto-dépublication (3 signalements, apply_auto_flag_threshold, 0006)
-- a déjà été atteint. Avec un unique signalement (le cas le plus courant), is_flagged est encore
-- false : "Confirmer" marquait le signalement résolu et notifiait l'auteur ("ton contenu a été
-- retiré, motif : ...") SANS jamais retirer le contenu — une notification mensongère et un sujet/
-- réponse toxique qui reste pleinement visible après une modération humaine explicite.
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

  update flags set status = case when action = 'confirm' then 'resolved' else 'dismissed' end
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

  if v_content_author is not null then
    insert into notifications (user_id, type, target_id, payload)
    values (
      v_content_author, 'flag_resolved', v_flag.target_id,
      jsonb_build_object('action', action, 'reason', v_flag.reason, 'target_type', v_flag.target_type)
    );
  end if;
end;
$$ language plpgsql security definer;
