-- §4.10 Paiements — PayPal (automatique) & WhatsApp/Orange Money (manuel). Table générique avec un
-- `method` en enum plutôt qu'une table par moyen de paiement. Kkiapay/CinetPay construits dès
-- maintenant (dormants derrière payments.mobile_money_aggregator, §4.8) — l'activation ne demandera
-- qu'un changement de clés + un flag, aucun développement supplémentaire.
alter table profiles add column is_premium boolean not null default false;
alter table profiles add column premium_until timestamptz;

create table payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  purpose text not null check (purpose in ('premium_offline','school_subscription','tutoring_session')),
  purpose_ref_id uuid,
  method text not null check (method in ('paypal','manual_whatsapp_om','mobile_money_aggregator')),
  amount numeric not null,
  currency text not null default 'XOF',
  status text not null default 'pending' check (status in ('pending','confirmed','rejected','refunded')),
  external_reference text,
  confirmed_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);
alter table payments enable row level security;
create policy "paiement visible par son auteur et le staff" on payments for select using (
  user_id = auth.uid()
  or exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin'))
);
create policy "utilisateur crée sa propre demande de paiement" on payments for insert with check (user_id = auth.uid());
create policy "seul le staff modifie un paiement" on payments for update using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin'))
);

-- Appelée uniquement par la route serveur qui traite le webhook PayPal (jamais depuis le client).
create or replace function confirm_paypal_payment(payment_id uuid, paypal_transaction_id text)
returns void as $$
begin
  update payments
  set status = 'confirmed', external_reference = paypal_transaction_id, confirmed_at = now()
  where id = payment_id and method = 'paypal';
end;
$$ language plpgsql security definer;

-- Confirmation manuelle par un membre du staff depuis l'admin, après vérification réelle sur Orange Money.
create or replace function confirm_manual_payment(payment_id uuid)
returns void as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin')) then
    raise exception 'Seul le staff peut confirmer un paiement manuel';
  end if;
  update payments
  set status = 'confirmed', confirmed_by = auth.uid(), confirmed_at = now()
  where id = payment_id and method = 'manual_whatsapp_om';
  insert into admin_actions_log (actor_id, action, target_type, target_id)
  values (auth.uid(), 'confirm_payment', 'payment', payment_id);
end;
$$ language plpgsql security definer;

-- Rejet manuel (référence Orange Money invalide/introuvable, Annexe A.12 "cas limites") — le document ne
-- fournit pas cette fonction explicitement mais décrit le flux en prose ; sans elle, un staff ne peut
-- que confirmer, jamais rejeter un paiement manuel douteux.
create or replace function reject_manual_payment(payment_id uuid, reason_note text default null)
returns void as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin')) then
    raise exception 'Seul le staff peut rejeter un paiement manuel';
  end if;
  update payments
  set status = 'rejected', confirmed_by = auth.uid(), confirmed_at = now()
  where id = payment_id and method = 'manual_whatsapp_om';
  insert into admin_actions_log (actor_id, action, target_type, target_id, note)
  values (auth.uid(), 'reject_payment', 'payment', payment_id, reason_note);
end;
$$ language plpgsql security definer;

-- Appelée uniquement par la route serveur qui traite le webhook Kkiapay/CinetPay (jamais depuis le
-- client). Construite et testée en sandbox dès la Phase 3 ; dormante tant que le flag reste désactivé.
create or replace function confirm_mobile_money_payment(payment_id uuid, aggregator_transaction_id text)
returns void as $$
begin
  update payments
  set status = 'confirmed', external_reference = aggregator_transaction_id, confirmed_at = now()
  where id = payment_id and method = 'mobile_money_aggregator';
end;
$$ language plpgsql security definer;

-- Trigger commun aux trois méthodes : applique l'effet métier dès qu'un paiement passe en confirmed.
create or replace function apply_payment_effect()
returns trigger as $$
begin
  if new.status = 'confirmed' and old.status <> 'confirmed' then
    if new.purpose = 'premium_offline' then
      update profiles set is_premium = true, premium_until = now() + interval '30 days' where id = new.user_id;
    elsif new.purpose = 'tutoring_session' then
      -- tutoring_sessions n'existe pas encore (Phase 4, non construite) — branche inerte jusque-là,
      -- comme prévu par le document (une fonction plpgsql ne valide ses références de table qu'à
      -- l'exécution du chemin concerné, jamais à la création).
      null;
    elsif new.purpose = 'school_subscription' then
      update schools set plan = 'standard' where id = new.purpose_ref_id;
    end if;
  elsif new.status = 'refunded' and old.status = 'confirmed' then
    -- Remboursement (Annexe A.12 "cas limites") : effet inverse — seul premium_offline a un effet
    -- réversible simple ici (école/tutorat n'ont pas de contrepartie "retour arrière" définie).
    if new.purpose = 'premium_offline' then
      update profiles set is_premium = false, premium_until = null where id = new.user_id;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_apply_payment_effect
  after update of status on payments
  for each row execute function apply_payment_effect();
