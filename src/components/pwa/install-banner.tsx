"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "@phosphor-icons/react";

const DISMISS_KEY = "le-shabba:install-banner-dismissed-at";
const DISMISS_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;
const ENGAGEMENT_KEY = "le-shabba:pages-viewed";
const ENGAGEMENT_THRESHOLD = 2;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallBanner() {
  const t = useTranslations("pwa");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt && Date.now() - Number(dismissedAt) < DISMISS_COOLDOWN_MS) return;

    const pagesViewed = Number(sessionStorage.getItem(ENGAGEMENT_KEY) ?? "0") + 1;
    sessionStorage.setItem(ENGAGEMENT_KEY, String(pagesViewed));
    if (pagesViewed < ENGAGEMENT_THRESHOLD) return;

    // Gated by the localStorage/sessionStorage checks above (dismissal cooldown, engagement
    // threshold) — not a plain value derivable at render time, a real effect is appropriate here.
    const iosDetected = /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsIOS(iosDetected);

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", () => setVisible(false));

    if (iosDetected) setVisible(true);

    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  }

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-30 mx-auto flex max-w-sm items-start gap-3 rounded-xl border border-neutral-200 bg-white p-3 shadow-lg dark:border-neutral-800 dark:bg-neutral-950">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon-192x192.png" alt="" className="h-8 w-8 rounded-lg" />
      <div className="flex-1">
        <p className="text-sm">{t("installText")}</p>
        {isIOS ? (
          <p className="mt-1 text-xs text-neutral-500">{t("iosInstructions")}</p>
        ) : (
          <button onClick={install} className="mt-2 min-h-11 rounded-xl bg-accent-blue px-3 text-sm font-medium text-white">
            {t("install")}
          </button>
        )}
      </div>
      <button onClick={dismiss} aria-label="close" className="flex min-h-11 min-w-11 items-center justify-center text-neutral-400">
        <X size={16} />
      </button>
    </div>
  );
}
