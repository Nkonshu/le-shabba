-- §4.12 Signalement d'anomalies techniques — distinct du signalement de contenu (flags, §4.6).
-- Accessible même sans compte (un visiteur peut tomber sur un bug avant même de s'inscrire).

create table bug_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references profiles(id),   -- nullable : un visiteur non connecté peut signaler
  contact_email text,                          -- optionnel, pour permettre un retour à un visiteur non connecté
  description text not null,
  page_url text,
  device_info text,                            -- user agent, capturé automatiquement, jamais saisi à la main
  screenshot_url text,
  status text not null default 'open' check (status in ('open','in_progress','resolved','wont_fix')),
  created_at timestamptz not null default now()
);
alter table bug_reports enable row level security;
create policy "n'importe qui peut signaler une anomalie, même sans compte" on bug_reports for insert with check (true);
create policy "auteur ou staff voit le signalement" on bug_reports for select using (
  reporter_id = auth.uid() or exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin'))
);
create policy "staff traite les signalements" on bug_reports for update using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin'))
);
