-- §4.14 / Phase 1 (§9) : code de parrainage court (généré à la création du profil, jamais
-- séquentiel/deviné) + journalisation des partages.

alter table profiles add column referral_code text unique;

create or replace function generate_referral_code()
returns text as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- exclut 0/O et 1/I/L, ambigus à l'oral/écrit
  result text;
  i int;
begin
  loop
    result := '';
    for i in 1..7 loop
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    end loop;
    exit when not exists (select 1 from profiles where referral_code = result);
  end loop;
  return result;
end;
$$ language plpgsql;

create or replace function set_referral_code()
returns trigger as $$
begin
  if new.referral_code is null then
    new.referral_code := generate_referral_code();
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_set_referral_code
  before insert on profiles
  for each row execute function set_referral_code();

create table share_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  content_type text not null check (content_type in ('document','topic','answer','achievement','streak','rank_up','referral_link')),
  content_id uuid,
  channel text not null check (channel in ('whatsapp','whatsapp_status','copy_link','native_share','other')),
  created_at timestamptz not null default now()
);
alter table share_events enable row level security;
create policy "n'importe qui peut journaliser un partage" on share_events for insert with check (true);
create policy "staff consulte les statistiques de partage" on share_events for select using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin'))
);
