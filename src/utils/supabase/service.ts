import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Client "service_role" — bypass RLS, à réserver aux contextes serveur de confiance qui ne passent
// jamais par une session utilisateur (webhooks PayPal/Kkiapay/CinetPay). Ne jamais importer ce
// fichier dans un composant "use client" : la clé service_role ne doit jamais atteindre le navigateur.
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
