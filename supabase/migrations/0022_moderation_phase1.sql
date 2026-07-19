-- Phase 1 (§9/Annexe A.5) : la policy d'insert sur `flags` (0006) ne prévoyait aucun bypass staff —
-- même un admin ne pouvait pas signaler un contenu, contrairement au reste de l'app où le staff
-- passe toujours les seuils de réputation.
drop policy "genie_points >= 1200 peut signaler" on flags;
create policy "genie_points >= 1200 ou staff peut signaler"
  on flags for insert with check (
    reporter_id = auth.uid()
    and exists (
      select 1 from profiles
      where id = auth.uid() and (genie_points >= 1200 or role in ('admin','super_admin'))
    )
  );

-- Traitement d'un signalement (Annexe A.5) : accessible ≥3500 pts ou staff, jamais sur son propre
-- contenu (auto-exclusion vérifiée côté serveur, pas seulement masquée en UI).
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
    end if;
    -- topic/answer : is_flagged reste true (déjà masqué du public par la policy de select, 0004) —
    -- pas de statut "removed" séparé pour le contenu du forum dans ce schéma.
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
