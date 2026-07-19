-- Gap réel dans le document (§4.9/A.10) : aucune policy INSERT ni fonction n'est fournie pour
-- école_memberships — seul le flux SQL de school_requests->approve_school_request crée la toute
-- première ligne (le school_admin fondateur). Le "flux d'invitation" décrit en prose (Annexe A.10 :
-- lien à durée limitée / import CSV + OTP) n'est jamais traduit en SQL exécutable. En attendant cette
-- construction complète (hors scope immédiat), un school_admin a besoin d'un moyen simple et sûr
-- d'ajouter un élève déjà inscrit sur Le Shabba à son école — cette fonction couvre ce besoin minimal,
-- avec la même limite de licence (max_seats) que "Règles métier" (Annexe A.10).
create or replace function add_school_member(target_school_id uuid, target_user uuid)
returns void as $$
declare
  v_seat_count int;
  v_max_seats int;
begin
  if not exists (
    select 1 from school_memberships
    where school_id = target_school_id and user_id = auth.uid() and role = 'school_admin'
  ) then
    raise exception 'Seul le school_admin de cette école peut ajouter un membre';
  end if;

  select count(*) into v_seat_count from school_memberships where school_id = target_school_id;
  select max_seats into v_max_seats from schools where id = target_school_id;
  if v_seat_count >= v_max_seats then
    raise exception 'Limite de licence atteinte, contacte Le Shabba pour l''augmenter';
  end if;

  insert into school_memberships (school_id, user_id, role)
  values (target_school_id, target_user, 'member')
  on conflict (school_id, user_id) do nothing;
end;
$$ language plpgsql security definer;
