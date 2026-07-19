"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/src/utils/supabase/client";

export function GoogleLoginButton({ returnTo }: { returnTo?: string | null }) {
  const t = useTranslations("auth");
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  async function continueWithGoogle() {
    setLoading(true);
    // Toujours ancré sur le domaine canonique de l'app, jamais sur window.location.origin : si un
    // visiteur clique ce bouton alors qu'il se trouve encore par erreur sur un autre domaine (ex.
    // dev.le-shabba.fr, le domaine de l'instance Supabase elle-même — sans app derrière), la
    // redirection post-connexion doit revenir sur la vraie app, pas reboucler sur ce domaine.
    const origin = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const callbackUrl = new URL("/auth/callback", origin);
    if (returnTo) callbackUrl.searchParams.set("next", returnTo);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl.toString() },
    });
  }

  return (
    <button
      onClick={continueWithGoogle}
      disabled={loading}
      className="min-h-11 rounded-xl border border-neutral-200 px-4 font-medium disabled:opacity-50 dark:border-neutral-800"
    >
      {t("continueWithGoogle")}
    </button>
  );
}
