import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // AJOUTE CES LOGS POUR TESTER :
  console.log("URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log("KEY EXISTE ?:", !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}