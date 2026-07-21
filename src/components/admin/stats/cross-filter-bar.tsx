"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Funnel, X, MagnifyingGlass } from "@phosphor-icons/react";
import { useRouter } from "@/src/i18n/navigation";

export type CrossFilterUser = { id: string; full_name: string | null };

const SELECT_CLASS =
  "min-h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-neutral-900";

// Filtre partagé (pays/niveau/utilisateur), rendu une seule fois au-dessus des onglets de /admin —
// contrairement aux filtres propres à chaque onglet (StatsFilterBar), celui-ci reste actif quand on
// change d'onglet, pour pouvoir croiser n'importe quelle section par une même dimension utilisateur.
export function CrossFilterBar({
  countries,
  levels,
  users,
  country,
  level,
  userIds,
}: {
  countries: { code: string; name: string }[];
  levels: { id: string; label: string; countryCode: string }[];
  users: CrossFilterUser[];
  country?: string;
  level?: string;
  userIds?: string;
}) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userFieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (userFieldRef.current && !userFieldRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const selectedIds = userIds ? userIds.split(",").filter(Boolean) : [];
  const activeCount = [country, level].filter(Boolean).length + selectedIds.length;
  const selectedUsers = selectedIds.map((id) => users.find((u) => u.id === id)).filter((u): u is CrossFilterUser => Boolean(u));
  const filteredUsers = userQuery
    ? users
        .filter((u) => !selectedIds.includes(u.id) && (u.full_name ?? "").toLowerCase().includes(userQuery.toLowerCase()))
        .slice(0, 8)
    : [];

  function update(key: "xCountry" | "xLevel" | "xUser", value: string) {
    const params = new URLSearchParams(window.location.search);
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/admin?${params.toString()}`);
  }

  function reset() {
    const params = new URLSearchParams(window.location.search);
    params.delete("xCountry");
    params.delete("xLevel");
    params.delete("xUser");
    router.push(`/admin?${params.toString()}`);
    setMobileOpen(false);
  }

  function addUser(u: CrossFilterUser) {
    update("xUser", [...selectedIds, u.id].join(","));
    setUserQuery("");
    setUserDropdownOpen(false);
  }

  function removeUser(id: string) {
    update("xUser", selectedIds.filter((i) => i !== id).join(","));
  }

  const fields = (
    <>
      <select value={country ?? ""} onChange={(e) => update("xCountry", e.target.value)} className={SELECT_CLASS}>
        <option value="">{t("crossFilterAllCountries")}</option>
        {countries.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name}
          </option>
        ))}
      </select>

      <select value={level ?? ""} onChange={(e) => update("xLevel", e.target.value)} className={SELECT_CLASS}>
        <option value="">{t("crossFilterAllLevels")}</option>
        {levels.map((l) => (
          <option key={l.id} value={l.id}>
            {l.countryCode} — {l.label}
          </option>
        ))}
      </select>

      <div ref={userFieldRef} className="relative flex flex-wrap items-center gap-1.5">
        {selectedUsers.map((u) => (
          <button
            key={u.id}
            onClick={() => removeUser(u.id)}
            className="flex min-h-11 items-center gap-2 rounded-xl border border-accent-blue bg-accent-blue/10 px-3 text-sm font-medium text-accent-blue"
          >
            {u.full_name ?? t("anonymous")}
            <X size={14} />
          </button>
        ))}
        <div className="relative">
          <MagnifyingGlass size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            value={userQuery}
            onChange={(e) => {
              setUserQuery(e.target.value);
              setUserDropdownOpen(true);
            }}
            onFocus={() => setUserDropdownOpen(true)}
            placeholder={t("crossFilterUserPlaceholder")}
            className={`${SELECT_CLASS} w-full pl-8 sm:w-56`}
          />
          {userDropdownOpen && userQuery && (
            <div className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
              {filteredUsers.length === 0 ? (
                <p className="px-3 py-2 text-xs text-neutral-400">{t("crossFilterNoUser")}</p>
              ) : (
                filteredUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => addUser(u)}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  >
                    {u.full_name ?? t("anonymous")}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="rounded-xl border border-accent-blue/30 bg-accent-blue/5 p-3 dark:bg-accent-blue/10">
      {/* Desktop/tablette : tout sur une ligne, assez de place. */}
      <div className="hidden flex-wrap items-center gap-2 sm:flex">
        <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-accent-blue">
          <Funnel size={15} />
          {t("crossFilterLabel")}
        </span>
        {fields}
        {activeCount > 0 && (
          <button
            onClick={reset}
            className="min-h-11 rounded-xl border border-neutral-200 px-3 text-xs font-medium dark:border-neutral-800"
          >
            {t("crossFilterReset")}
          </button>
        )}
      </div>

      {/* Mobile : bouton compact avec badge, ouvre un panneau en bas d'écran — pas assez de place
          pour trois selects + une recherche sur une ligne à côté du reste de la page. */}
      <button
        onClick={() => setMobileOpen(true)}
        className="flex min-h-11 w-full items-center justify-between rounded-xl text-sm font-medium text-accent-blue sm:hidden"
      >
        <span className="flex items-center gap-2">
          <Funnel size={16} />
          {t("crossFilterLabel")}
        </span>
        {activeCount > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-blue px-1.5 text-[10px] font-bold text-white">
            {activeCount}
          </span>
        )}
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 sm:hidden" onClick={() => setMobileOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex flex-col gap-3 rounded-t-2xl border-t border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950"
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-black">
                <Funnel size={16} />
                {t("crossFilterLabel")}
              </span>
              <button
                onClick={() => setMobileOpen(false)}
                aria-label={tc("close")}
                className="flex min-h-11 min-w-11 items-center justify-center"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex flex-col gap-2">{fields}</div>
            <div className="flex gap-2 pt-1">
              {activeCount > 0 && (
                <button
                  onClick={reset}
                  className="min-h-11 flex-1 rounded-xl border border-neutral-200 text-sm font-medium dark:border-neutral-800"
                >
                  {t("crossFilterReset")}
                </button>
              )}
              <button
                onClick={() => setMobileOpen(false)}
                className="min-h-11 flex-1 rounded-xl bg-accent-blue text-sm font-medium text-white"
              >
                {t("crossFilterApply")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
