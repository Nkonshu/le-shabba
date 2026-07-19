"use client";

import { useEffect, useRef, useState } from "react";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/src/i18n/navigation";

export function SearchBar() {
  const t = useTranslations("common");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mobileOpen) mobileInputRef.current?.focus();
  }, [mobileOpen]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setMobileOpen(false);
    router.push(`/recherche?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <>
      {/* Desktop/tablette : barre toujours visible, assez de place dans l'en-tête. */}
      <form onSubmit={handleSubmit} className="relative hidden w-full max-w-xl flex-1 sm:block">
        <MagnifyingGlass size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("search")}
          className="min-h-11 w-full rounded-xl border border-neutral-200 bg-white pl-9 pr-3 text-sm dark:border-neutral-800 dark:bg-neutral-900"
        />
      </form>

      {/* Mobile : icône seule dans l'en-tête (pas assez de place pour un vrai champ à côté du logo
          et de la connexion/langue) — au tap, une bande passe en overlay plein écran par-dessus
          l'en-tête, lui laissant toute la largeur. */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label={t("search")}
        title={t("search")}
        className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-50 sm:hidden"
      >
        <MagnifyingGlass size={20} />
      </button>

      {mobileOpen && (
        <div className="fixed inset-x-0 top-0 z-50 flex items-center gap-1 border-b border-neutral-100 bg-white px-3 py-2 dark:border-neutral-900 dark:bg-neutral-950 sm:hidden">
          <form onSubmit={handleSubmit} className="relative flex-1">
            <MagnifyingGlass size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              ref={mobileInputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("search")}
              className="min-h-11 w-full rounded-xl border border-neutral-200 bg-white pl-9 pr-3 text-sm dark:border-neutral-800 dark:bg-neutral-900"
            />
          </form>
          <button
            onClick={() => setMobileOpen(false)}
            aria-label={t("close")}
            title={t("close")}
            className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl text-neutral-500"
          >
            <X size={20} />
          </button>
        </div>
      )}
    </>
  );
}
