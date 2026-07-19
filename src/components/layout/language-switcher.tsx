"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/src/i18n/navigation";

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const other = locale === "fr" ? "en" : "fr";

  return (
    <button
      onClick={() => router.replace(pathname, { locale: other })}
      className="min-h-11 rounded-xl px-3 text-sm font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-50"
    >
      {other.toUpperCase()}
    </button>
  );
}
