-- Faille réelle dans le schéma tel que décrit au §4.10 : confirm_paypal_payment et
-- confirm_mobile_money_payment n'ont AUCUNE vérification interne (contrairement à
-- confirm_manual_payment, qui exige explicitement role in ('admin','super_admin')) — le document se
-- contente d'un commentaire ("Appelée uniquement par la route serveur qui traite le webhook") comme
-- SEULE protection. Une simple convention n'empêche rien : n'importe quel client authentifié peut
-- appeler ces fonctions via PostgREST (`supabase.rpc(...)`) avec un `payment_id` qu'il connaît déjà
-- (le sien) et confirmer son propre paiement sans avoir réellement payé.
--
-- Correctif : retirer le droit d'exécution à `anon`/`authenticated`. Le self-hosted Supabase accorde
-- EXECUTE à ces deux rôles par défaut sur toute nouvelle fonction (privilèges par défaut du schéma
-- public) — un simple `revoke ... from public` ne suffit pas, il faut révoquer explicitement sur
-- chacun des deux rôles. Seul `service_role` (clé secrète, jamais exposée au client) garde le droit
-- de les appeler — exactement le contexte des routes serveur qui traitent les webhooks
-- PayPal/Kkiapay/CinetPay (jamais le navigateur).
revoke execute on function confirm_paypal_payment(uuid, text) from anon, authenticated;
revoke execute on function confirm_mobile_money_payment(uuid, text) from anon, authenticated;
