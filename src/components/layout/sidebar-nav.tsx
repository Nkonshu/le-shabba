"use client";

import { useTranslations } from "next-intl";
import {
  BookOpen,
  FileText,
  NotePencil,
  ChatCircle,
  Question,
  Trophy,
  Star,
  DownloadSimple,
} from "@phosphor-icons/react";
import { Link, usePathname } from "@/src/i18n/navigation";

type NavItem = { href: string; labelKey: string; icon: typeof BookOpen };

const GROUPS: { labelKey: string; items: NavItem[] }[] = [
  {
    labelKey: "groupContent",
    items: [
      { href: "/cours", labelKey: "courses", icon: BookOpen },
      { href: "/epreuves", labelKey: "exams", icon: FileText },
      { href: "/fiches-revision", labelKey: "revisionSheets", icon: NotePencil },
    ],
  },
  {
    labelKey: "groupCommunity",
    items: [
      { href: "/forum", labelKey: "forum", icon: ChatCircle },
      { href: "/demandes", labelKey: "requests", icon: Question },
      { href: "/participants", labelKey: "participants", icon: Trophy },
    ],
  },
];

const PERSONAL_GROUP_LABEL_KEY = "groupPersonal";

// Nav structurelle groupée par thème, icône + état actif (barre latérale colorée + gras) —
// disposition Stack Overflow : colonne persistante distincte du header (site-header.tsx).
export function SidebarNav({ showFavorites }: { showFavorites: boolean }) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function itemClass(href: string) {
    const active = isActive(href);
    return `flex min-h-11 shrink-0 items-center gap-2 border-l-2 px-3 text-sm leading-[2.75rem] md:leading-normal md:py-2.5 ${
      active
        ? "border-accent-blue font-semibold text-neutral-900 dark:text-neutral-50"
        : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-50"
    }`;
  }

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-neutral-100 px-2 py-2 text-sm dark:border-neutral-900 md:sticky md:top-0 md:h-dvh md:w-56 md:shrink-0 md:flex-col md:gap-0.5 md:overflow-y-auto md:overflow-x-visible md:border-b-0 md:border-r md:px-2 md:py-4">
      {GROUPS.map((group) => (
        <div key={group.labelKey} className="contents md:block">
          <p className="hidden px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-400 md:block">
            {t(group.labelKey)}
          </p>
          {group.items.map((item) => (
            <Link key={item.href} href={item.href} className={itemClass(item.href)}>
              <item.icon size={16} className="shrink-0" />
              <span>{t(item.labelKey)}</span>
            </Link>
          ))}
        </div>
      ))}

      {showFavorites && (
        <div className="contents md:block">
          <p className="hidden px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-400 md:block">
            {t(PERSONAL_GROUP_LABEL_KEY)}
          </p>
          <Link href="/favoris" className={itemClass("/favoris")}>
            <Star size={16} className="shrink-0" />
            <span>{t("favorites")}</span>
          </Link>
          <Link href="/telechargements" className={itemClass("/telechargements")}>
            <DownloadSimple size={16} className="shrink-0" />
            <span>{t("downloads")}</span>
          </Link>
        </div>
      )}
      {!showFavorites && (
        <Link href="/telechargements" className={itemClass("/telechargements")}>
          <DownloadSimple size={16} className="shrink-0" />
          <span>{t("downloads")}</span>
        </Link>
      )}
    </nav>
  );
}
