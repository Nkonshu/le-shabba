-- Jusqu'ici seul un compteur agrégé (clicks_count) existait — impossible de savoir QUI a cliqué.
-- Table de log détaillé : une ligne par clic, user_id nul pour un visiteur anonyme (pas d'erreur,
-- juste une ligne "anonyme" en plus). Lecture réservée au staff, jamais exposée au partenaire lui-même.
create table sponsored_slot_clicks (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references sponsored_slots(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  clicked_at timestamptz not null default now()
);
alter table sponsored_slot_clicks enable row level security;
create policy "log des clics visible par le staff" on sponsored_slot_clicks for select using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'super_admin'))
);

create or replace function record_sponsored_click(p_slot_id uuid)
returns text
language plpgsql security definer as $$
declare
  v_url text;
begin
  update sponsored_slots set clicks_count = clicks_count + 1
  where id = p_slot_id
  returning link_url into v_url;

  insert into sponsored_slot_clicks (slot_id, user_id) values (p_slot_id, auth.uid());

  return v_url;
end;
$$;
