"use client";

import { useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/src/i18n/navigation";

export function SearchBar() {
  const t = useTranslations("common");
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/recherche?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-xl flex-1">
      <MagnifyingGlass size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("search")}
        className="min-h-11 w-full rounded-xl border border-neutral-200 bg-white pl-9 pr-3 text-sm dark:border-neutral-800 dark:bg-neutral-900"
      />
    </form>
  );
}
