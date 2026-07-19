"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

const RECHECK_INTERVAL_MS = 10000;
const FETCH_TIMEOUT_MS = 4000;

// navigator.onLine seul est peu fiable (il reflète juste "une interface réseau est active", pas "le
// serveur est joignable" — un VPN/Tailscale qui bascule ou un simple hoquet du wifi peut le faire
// répondre false pendant que la page a déjà chargé son contenu depuis le réseau). On ne déclare donc
// hors-ligne qu'après une vraie requête réseau ratée, jamais sur la seule lecture de navigator.onLine.
async function isReallyOnline(): Promise<boolean> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return false;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    await fetch("/manifest.webmanifest", { method: "HEAD", cache: "no-store", signal: controller.signal });
    clearTimeout(timeout);
    return true;
  } catch {
    return false;
  }
}

// §6 : bannière fixe en haut de l'app quand la connexion réseau réelle est perdue.
export function OfflineIndicator() {
  const t = useTranslations("pwa");
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const online = await isReallyOnline();
      if (!cancelled) setOffline(!online);
    }

    check();
    const interval = setInterval(check, RECHECK_INTERVAL_MS);
    window.addEventListener("online", check);
    window.addEventListener("offline", check);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("online", check);
      window.removeEventListener("offline", check);
    };
  }, []);

  if (!offline) return null;

  return (
    <div role="status" className="bg-neutral-900 py-1.5 text-center text-xs text-white dark:bg-neutral-100 dark:text-neutral-900">
      {t("offlineBanner")}
    </div>
  );
}
