"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/src/i18n/navigation";

export type SelectFilterOption = { value: string; label: string };

// Barre de filtres générique (dates + selects optionnels) pour une section stats d'un onglet admin.
// Écrit directement dans l'URL (comme JournalFilters) — filtrer = naviguer, cohérent avec le reste
// de /admin qui est entièrement en composants serveur pilotés par searchParams.
export function StatsFilterBar({
  tab,
  paramPrefix,
  from,
  to,
  selects = [],
}: {
  tab: string;
  paramPrefix: string;
  from?: string;
  to?: string;
  selects?: { key: string; value?: string; options: SelectFilterOption[] }[];
}) {
  const tCommon = useTranslations("common");
  const tAdmin = useTranslations("admin");
  const router = useRouter();

  function currentParams(): URLSearchParams {
    return new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  }

  function update(key: string, value: string) {
    const params = currentParams();
    params.set("tab", tab);
    if (value) params.set(`${paramPrefix}${key}`, value);
    else params.delete(`${paramPrefix}${key}`);
    router.push(`/admin?${params.toString()}`);
  }

  function reset() {
    const params = currentParams();
    params.set("tab", tab);
    for (const key of [...params.keys()]) {
      if (key.startsWith(paramPrefix)) params.delete(key);
    }
    router.push(`/admin?${params.toString()}`);
  }

  const inputClass =
    "min-h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-neutral-900";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-1 text-xs text-neutral-400">
        {tAdmin("statsFrom")}
        <input type="date" value={from ?? ""} onChange={(e) => update("From", e.target.value)} className={inputClass} />
      </label>
      <label className="flex items-center gap-1 text-xs text-neutral-400">
        {tAdmin("statsTo")}
        <input type="date" value={to ?? ""} onChange={(e) => update("To", e.target.value)} className={inputClass} />
      </label>
      {selects.map((s) => (
        <select key={s.key} value={s.value ?? ""} onChange={(e) => update(s.key, e.target.value)} className={inputClass}>
          <option value="">{tCommon("selectPlaceholder")}</option>
          {s.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ))}
      {(from || to || selects.some((s) => s.value)) && (
        <button onClick={reset} className="min-h-11 rounded-xl border border-neutral-200 px-3 text-xs font-medium dark:border-neutral-800">
          {tAdmin("statsResetFilters")}
        </button>
      )}
    </div>
  );
}
