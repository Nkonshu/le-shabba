-- Suppression de compte : jamais un vrai DELETE (le contenu déjà publié — cours, questions,
-- réponses — reste utile aux autres élèves et ne doit pas casser une discussion où quelqu'un a déjà
-- répondu). On anonymise le profil à la place et on marque `deleted_at`, exactement la politique déjà
-- annoncée sur la page Confidentialité mais jamais construite jusqu'ici.
alter table profiles add column deleted_at timestamptz;

create or replace function delete_own_account()
returns void as $$
begin
  update profiles set
    full_name = null,
    avatar_url = null,
    bio = null,
    deleted_at = now()
  where id = auth.uid();
end;
$$ language plpgsql security definer;
