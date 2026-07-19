-- §4.11 / Phase 1 (§9) : demandes de documents. `fulfill_document_request` appelle award_points
-- dans le document tel qu'écrit, mais cette fonction n'existe qu'en §4.13 (Phase 2) — même
-- simplification déjà appliquée à mark_answer_as_solution (0004) : différée en commentaire, pas
-- de blocage de cette migration sur une fonction inexistante.

create table document_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references profiles(id),
  title text not null,
  level_id uuid references education_levels(id),
  subject text not null,
  country_id uuid references countries(id),
  status text not null default 'open' check (status in ('open','fulfilled')),
  fulfilled_by_document_id uuid references documents(id),
  created_at timestamptz not null default now()
);
alter table document_requests enable row level security;
create policy "demandes visibles par tous" on document_requests for select using (true);
create policy "utilisateur non banni peut demander" on document_requests for insert with check (
  requester_id = auth.uid()
  and not is_currently_banned(auth.uid())
);

create or replace function fulfill_document_request(request_id uuid, doc_id uuid)
returns void as $$
begin
  if not exists (select 1 from documents where id = doc_id and author_id = auth.uid()) then
    raise exception 'Seul l''auteur du document peut le lier à une demande';
  end if;
  if not exists (select 1 from document_requests where id = request_id and status = 'open') then
    raise exception 'Cette demande n''est plus ouverte';
  end if;

  update document_requests set status = 'fulfilled', fulfilled_by_document_id = doc_id where id = request_id;
  -- perform award_points((select author_id from documents where id = doc_id), 15, 'demande_satisfaite'); -- §4.13, Phase 2
end;
$$ language plpgsql security definer;
