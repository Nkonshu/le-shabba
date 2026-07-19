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
    const callbackUrl = new URL("/auth/callback", window.location.origin);
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
