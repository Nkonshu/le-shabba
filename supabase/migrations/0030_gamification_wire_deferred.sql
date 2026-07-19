-- Phase 2 : active les appels à award_points/award_badge_once/apply_referral_bonus_if_activated
-- laissés en commentaire dans des fonctions migrées en Phase 0/1, en attendant ce socle (§4.13).

create or replace function mark_answer_as_solution(answer_id uuid)
returns void as $$
declare
  v_topic_author uuid;
  v_topic_id uuid;
  v_answer_author uuid;
begin
  select topic_id into v_topic_id from forum_answers where id = answer_id;
  select author_id into v_topic_author from forum_topics where id = v_topic_id;

  if v_topic_author <> auth.uid()
     and not exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin')) then
    raise exception 'Seul l''auteur du sujet peut valider une solution';
  end if;

  update forum_answers set is_solution = false where topic_id = v_topic_id and is_solution = true;
  update forum_answers set is_solution = true where id = answer_id;

  select author_id into v_answer_author from forum_answers where id = answer_id;
  perform award_points(v_answer_author, 20, 'solution_validee');
  perform award_badge_once(v_answer_author, 'premiere_solution');
  perform apply_referral_bonus_if_activated(v_answer_author);

  insert into notifications (user_id, type, target_id, payload)
  values (
    v_answer_author,
    'answer_marked_solution',
    answer_id,
    jsonb_build_object('points', 20, 'topic_id', v_topic_id)
  );
end;
$$ language plpgsql security definer;

create or replace function apply_document_verification_threshold()
returns trigger as $$
begin
  if new.status = 'unverified' and new.votes_count >= 5 and not exists (
    select 1 from flags where target_type = 'document' and target_id = new.id and status = 'open'
  ) then
    update documents set status = 'community_verified' where id = new.id;
    perform award_points(new.author_id, 50, 'document_verifie');
    perform apply_referral_bonus_if_activated(new.author_id);
    insert into notifications (user_id, type, target_id, payload)
    values (new.author_id, 'document_verified', new.id, jsonb_build_object('points', 50));
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Un document peut aussi passer directement d'unverified à staff_verified (vérification manuelle plus
-- rapide que le seuil communautaire) : mêmes points/parrainage que la voie communautaire, une seule
-- fois (garde sur l'ancien statut pour ne pas re-verser si le document était déjà community_verified).
create or replace function mark_document_staff_verified(doc_id uuid)
returns void as $$
declare
  v_old_status text;
  v_author uuid;
begin
  if not exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin')) then
    raise exception 'Seul un membre du staff peut vérifier un document';
  end if;

  select status, author_id into v_old_status, v_author from documents where id = doc_id;
  update documents set status = 'staff_verified' where id = doc_id;

  if v_old_status = 'unverified' then
    perform award_points(v_author, 50, 'document_verifie');
    perform apply_referral_bonus_if_activated(v_author);
    insert into notifications (user_id, type, target_id, payload)
    values (v_author, 'document_verified', doc_id, jsonb_build_object('points', 50, 'status', 'staff_verified'));
  end if;
end;
$$ language plpgsql security definer;

create or replace function fulfill_document_request(request_id uuid, doc_id uuid)
returns void as $$
declare
  v_doc_author uuid;
begin
  if not exists (select 1 from documents where id = doc_id and author_id = auth.uid()) then
    raise exception 'Seul l''auteur du document peut le lier à une demande';
  end if;
  if not exists (select 1 from document_requests where id = request_id and status = 'open') then
    raise exception 'Cette demande n''est plus ouverte';
  end if;

  update document_requests set status = 'fulfilled', fulfilled_by_document_id = doc_id where id = request_id;

  select author_id into v_doc_author from documents where id = doc_id;
  perform award_points(v_doc_author, 15, 'demande_satisfaite');
end;
$$ language plpgsql security definer;
