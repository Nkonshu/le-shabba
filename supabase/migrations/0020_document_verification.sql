-- Phase 1 (§9/Annexe A.2) : bascule automatique en community_verified dès +5 votes nets sans
-- signalement ouvert, jamais recalculée une fois déjà vérifiée (sinon la notification se
-- répéterait à chaque nouveau vote). staff_verified reste une action manuelle du staff
-- (Annexe A.2 : "réservé aux annales officielles où l'exactitude prime sur la vitesse").

create or replace function apply_document_verification_threshold()
returns trigger as $$
begin
  if new.status = 'unverified' and new.votes_count >= 5 and not exists (
    select 1 from flags where target_type = 'document' and target_id = new.id and status = 'open'
  ) then
    update documents set status = 'community_verified' where id = new.id;
    insert into notifications (user_id, type, target_id, payload)
    values (new.author_id, 'document_verified', new.id, jsonb_build_object('points', 50));
    -- perform award_points(new.author_id, 50, 'document_verifie'); -- §4.13, Phase 2 uniquement
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_document_verification_threshold
  after update of votes_count on documents
  for each row execute function apply_document_verification_threshold();

create or replace function mark_document_staff_verified(doc_id uuid)
returns void as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin')) then
    raise exception 'Seul un membre du staff peut vérifier un document';
  end if;
  update documents set status = 'staff_verified' where id = doc_id;
end;
$$ language plpgsql security definer;
