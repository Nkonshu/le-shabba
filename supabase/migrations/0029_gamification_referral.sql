-- Phase 2 / §4.13 : parrainage.

alter table profiles add column referred_by uuid references profiles(id);
-- referred_by est renseigné à l'onboarding (Annexe A.1) si un code de parrainage a été saisi.

-- Correction : le document (§4.13) ne prévoit pas de garde contre un double versement. Un filleul qui
-- valide une deuxième solution (ou un deuxième document vérifié) après activation redéclencherait
-- apply_referral_bonus_if_activated et re-verserait +40 points à chaque fois — `referral_activated_at`
-- rend l'activation idempotente (le badge 'parrain', lui, l'était déjà via award_badge_once, mais pas
-- les points, versés par award_points sans déduplication).
alter table profiles add column referral_activated_at timestamptz;

create or replace function apply_referral_bonus_if_activated(target_user uuid)
returns void as $$
declare
  v_referrer uuid;
  v_already_activated boolean;
begin
  select referred_by, referral_activated_at is not null
    into v_referrer, v_already_activated
    from profiles where id = target_user;

  if v_referrer is null or v_already_activated then
    return;
  end if;

  update profiles set referral_activated_at = now() where id = target_user;
  perform award_points(v_referrer, 40, 'parrainage');
  perform award_badge_once(v_referrer, 'parrain');
end;
$$ language plpgsql security definer;
