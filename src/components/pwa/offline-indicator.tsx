"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

// §6 : bannière fixe en haut de l'app quand navigator.onLine === false.
export function OfflineIndicator() {
  const t = useTranslations("pwa");
  const [offline, setOffline] = useState(() => typeof navigator !== "undefined" && !navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div role="status" className="bg-neutral-900 py-1.5 text-center text-xs text-white dark:bg-neutral-100 dark:text-neutral-900">
      {t("offlineBanner")}
    </div>
  );
}
