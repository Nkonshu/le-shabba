"use client";

import { useTranslations } from "next-intl";
import { useAuthGate } from "@/src/components/auth/auth-modal-provider";

export function HeaderLoginButton() {
  const t = useTranslations("nav");
  const authGate = useAuthGate();

  return (
    <button
      onClick={() => authGate(null)}
      className="min-h-11 rounded-xl bg-accent-blue px-4 text-sm font-medium leading-[2.75rem] text-white"
    >
      {t("login")}
    </button>
  );
}
