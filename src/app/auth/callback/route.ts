import { NextResponse } from "next/server";
import { createClient } from "@/src/utils/supabase/server";

// `next` vient d'un paramètre contrôlé par le client (page d'où la connexion a été déclenchée) —
// on n'accepte qu'un chemin relatif interne ("/xxx") pour éviter une redirection ouverte vers un
// domaine externe si jamais quelqu'un forge ce paramètre.
function safeNext(next: string | null): string | null {
  if (!next) return null;
  if (!next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeNext(requestUrl.searchParams.get("next"));
  // request.url reflète l'hôte tel que vu par le serveur Next.js derrière le reverse proxy
  // (`localhost:3000` en interne), pas le domaine public — jamais fiable pour construire une
  // redirection, même raison que le bouton de connexion Google (NEXT_PUBLIC_SITE_URL).
  const origin = process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next ?? "/"}`);
    }
  }

  return NextResponse.redirect(`${origin}/fr/login?error=oauth`);
}
