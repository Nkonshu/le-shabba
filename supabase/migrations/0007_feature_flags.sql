-- §4.8 Feature flags (gouvernance détaillée en §5)

create table feature_flags (
  key text primary key,
  enabled boolean not null default true,
  scope text not null default 'global',
  description text,
  updated_by uuid references profiles(id),
  updated_at timestamptz not null default now()
);
alter table feature_flags enable row level security;
create policy "flags lisibles par tous les clients" on feature_flags for select using (true);
create policy "flags modifiables par staff uniquement" on feature_flags for update using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin'))
);

create table feature_flags_audit (
  id uuid primary key default gen_random_uuid(),
  flag_key text not null references feature_flags(key),
  old_value boolean,
  new_value boolean,
  changed_by uuid references profiles(id),
  changed_at timestamptz not null default now()
);
alter table feature_flags_audit enable row level security;
create policy "audit lisible par staff" on feature_flags_audit for select using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin'))
);

create or replace function log_feature_flag_change()
returns trigger as $$
begin
  insert into feature_flags_audit (flag_key, old_value, new_value, changed_by)
  values (new.key, old.enabled, new.enabled, auth.uid());
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_feature_flags_audit
  after update of enabled on feature_flags
  for each row execute function log_feature_flag_change();

-- Seed initial des flags (tous activés par défaut sauf mention contraire)
insert into feature_flags (key, enabled, description) values
  ('publication.documents', true, 'Publication de cours/épreuves par la communauté'),
  ('publication.wiki_edit', true, 'Édition collaborative des documents par les utilisateurs à réputation suffisante'),
  ('publication.forum_answers', true, 'Réponses au forum'),
  ('publication.document_requests', true, 'Demandes de documents par la communauté'),
  ('support.bug_reports', true, 'Signalement d''anomalies techniques, y compris par des visiteurs non connectés'),
  ('gamification.parrainage', true, 'Code de parrainage à l''onboarding et bonus de points associé'),
  ('growth.share_button', true, 'Bouton Partager sur documents/sujets/réussites'),
  ('growth.achievement_sharing', true, 'Invitation à partager badge/rang/série obtenus'),
  ('monetization.premium_offline', false, 'Offre payante offline illimité'),
  ('monetization.ads', false, 'Bannières publicitaires'),
  ('monetization.tutoring', false, 'Marketplace de tutorat'),
  ('monetization.school_spaces', false, 'Espaces école privés (multi-tenance, façon Stack Overflow for Teams)'),
  ('payments.paypal', false, 'Paiement automatique via PayPal'),
  ('payments.manual_whatsapp_om', false, 'Paiement manuel via WhatsApp Business + Orange Money, confirmé par le staff'),
  ('payments.mobile_money_aggregator', false, 'Kkiapay/CinetPay — intégration construite et testée en sandbox dès la Phase 3, désactivée jusqu''à activation (KYC entreprise validé + clés de production)'),
  ('platform.maintenance_mode', false, 'Site en lecture seule');
