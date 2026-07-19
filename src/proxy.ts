import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/src/i18n/routing";
import { createMiddlewareClient } from "@/src/utils/supabase/middleware";

const intlMiddleware = createIntlMiddleware(routing);

// Chemins (après le préfixe de langue) où la redirection obligatoire vers /onboarding (Annexe A.1)
// ne s'applique pas — sinon un utilisateur sans profil encore créé ne pourrait jamais atteindre
// /onboarding lui-même, ni /login en cas de reconnexion partielle.
const ONBOARDING_EXEMPT_PATHS = ["/login", "/onboarding"];

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Le callback OAuth n'est pas préfixé par une langue — ne jamais le faire passer par next-intl,
  // qui le redirigerait vers /fr/auth/callback et casserait l'échange de code Supabase.
  if (pathname.startsWith("/auth/")) {
    return NextResponse.next();
  }

  // Lien de parrainage court (Annexe A.4/A.1) : volontairement non préfixé par une langue pour rester
  // court à partager sur WhatsApp — redirige vers l'onboarding avec le code en query param, dans la
  // langue déjà connue du navigateur (cookie posé par next-intl) ou la langue par défaut sinon.
  if (pathname.startsWith("/r/")) {
    const code = pathname.slice(3);
    const locale = request.cookies.get("NEXT_LOCALE")?.value ?? routing.defaultLocale;
    return NextResponse.redirect(new URL(`/${locale}/onboarding?ref=${encodeURIComponent(code)}`, request.url));
  }

  const response = await intlMiddleware(request);

  // next-intl vient de rediriger pour ajouter le préfixe de langue manquant (ex. "/" -> "/fr") —
  // rien d'autre à faire ici, la requête suivante repassera par ce proxy avec le bon préfixe.
  if (response.status >= 300 && response.status < 400) {
    return response;
  }

  const supabase = createMiddlewareClient(request, response);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const segments = pathname.split("/").filter(Boolean);
    const locale = segments[0];
    const pathWithoutLocale = "/" + segments.slice(1).join("/");
    const isExempt = ONBOARDING_EXEMPT_PATHS.some((p) => pathWithoutLocale.startsWith(p));

    if (!isExempt) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, deleted_at")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile) {
        const redirectResponse = NextResponse.redirect(new URL(`/${locale}/onboarding`, request.url));
        response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
        return redirectResponse;
      }

      // Compte supprimé (delete_own_account) : le profil reste en base (anonymisé, contenu
      // conservé) mais plus personne ne doit pouvoir se reconnecter dessus — on ferme la session
      // immédiatement plutôt que de laisser un utilisateur "revenir" sur un compte anonymisé.
      if (profile.deleted_at) {
        await supabase.auth.signOut();
        const redirectResponse = NextResponse.redirect(new URL(`/${locale}/login?deleted=1`, request.url));
        response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
        return redirectResponse;
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
