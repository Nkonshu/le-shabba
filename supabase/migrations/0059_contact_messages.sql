-- Formulaire de contact avec pièce jointe (page /contact) — même logique que bug_reports (0008) :
-- accessible sans compte (un visiteur peut vouloir écrire avant même de s'inscrire), avec un email
-- de contact obligatoire cette fois (contrairement à un bug, un message de contact n'a de sens que
-- si on peut y répondre).

create table contact_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references profiles(id),   -- nullable : un visiteur non connecté peut écrire
  full_name text not null,
  contact_email text not null,
  subject text not null,
  message text not null,
  attachment_url text,
  status text not null default 'new' check (status in ('new','read','replied','archived')),
  created_at timestamptz not null default now()
);
alter table contact_messages enable row level security;
create policy "n'importe qui peut envoyer un message de contact, même sans compte" on contact_messages for insert with check (true);
create policy "auteur ou staff voit le message" on contact_messages for select using (
  sender_id = auth.uid() or exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin'))
);
create policy "staff traite les messages" on contact_messages for update using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin'))
);
