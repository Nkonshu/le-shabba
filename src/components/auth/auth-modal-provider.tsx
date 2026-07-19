"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "@phosphor-icons/react";
import { GoogleLoginButton } from "@/src/components/auth/google-login-button";

type AuthModalContextValue = {
  openAuthModal: (returnTo?: string) => void;
};

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function useAuthGate() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error("useAuthGate must be used within AuthModalProvider");
  const { openAuthModal } = ctx;

  // Retourne true si l'appelant peut continuer immédiatement, false s'il doit attendre la connexion
  // (auquel cas la modale s'ouvre et se charge de renvoyer l'utilisateur ici après coup).
  return useCallback(
    (userId: string | null, returnTo?: string) => {
      if (userId) return true;
      openAuthModal(returnTo);
      return false;
    },
    [openAuthModal]
  );
}

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const t = useTranslations("auth");
  const [returnTo, setReturnTo] = useState<string | null>(null);

  const openAuthModal = useCallback((path?: string) => {
    setReturnTo(path ?? (typeof window !== "undefined" ? window.location.pathname + window.location.search : "/"));
  }, []);

  const closeAuthModal = useCallback(() => setReturnTo(null), []);

  const value = useMemo(() => ({ openAuthModal }), [openAuthModal]);

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      {returnTo !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 md:items-center"
          onClick={closeAuthModal}
        >
          <div
            className="relative w-full max-w-sm rounded-t-2xl bg-white p-6 dark:bg-neutral-950 md:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeAuthModal}
              aria-label={t("close")}
              title={t("close")}
              className="absolute right-3 top-3 flex min-h-11 min-w-11 items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50"
            >
              <X size={18} />
            </button>
            <h2 className="mb-1 text-lg font-black">{t("loginTitle")}</h2>
            <p className="mb-4 text-sm text-neutral-500">{t("loginModalBody")}</p>
            <GoogleLoginButton returnTo={returnTo} />
          </div>
        </div>
      )}
    </AuthModalContext.Provider>
  );
}
