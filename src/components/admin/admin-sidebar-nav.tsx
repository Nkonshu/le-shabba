"use client";

import { useState } from "react";
import { List, X } from "@phosphor-icons/react";
import { Link } from "@/src/i18n/navigation";

export type AdminTabLink = { key: string; href: string; label: string };

// Remplace l'ancienne bande d'onglets horizontale (qui débordait avec 9 entrées) par une
// navigation latérale sur desktop et un tiroir plein écran sur mobile — un seul jeu de liens
// partagé entre les deux, pour ne jamais désynchroniser les deux présentations.
export function AdminSidebarNav({ tabs, activeTab }: { tabs: AdminTabLink[]; activeTab: string }) {
  const [open, setOpen] = useState(false);
  const activeLabel = tabs.find((tab) => tab.key === activeTab)?.label ?? "";

  const linkClass = (active: boolean) =>
    `flex min-h-11 items-center rounded-lg border-l-2 px-3 text-sm font-medium ${
      active
        ? "border-accent-blue bg-accent-blue/10 text-accent-blue"
        : "border-transparent text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-900"
    }`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-11 w-fit items-center gap-2 rounded-xl border border-neutral-200 px-3 text-sm font-medium dark:border-neutral-800 lg:hidden"
      >
        <List size={18} />
        {activeLabel}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <nav className="relative flex w-64 flex-col gap-1 overflow-y-auto bg-white p-3 dark:bg-neutral-950">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-sm font-bold">Menu</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="close"
                className="flex min-h-8 min-w-8 items-center justify-center text-neutral-400"
              >
                <X size={18} />
              </button>
            </div>
            {tabs.map((tab) => (
              <Link key={tab.key} href={tab.href} onClick={() => setOpen(false)} className={linkClass(tab.key === activeTab)}>
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>
      )}

      <nav className="hidden lg:flex lg:w-56 lg:shrink-0 lg:flex-col lg:gap-1">
        {tabs.map((tab) => (
          <Link key={tab.key} href={tab.href} className={linkClass(tab.key === activeTab)}>
            {tab.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
