"use client";

import { useTranslations } from "next-intl";
import { ChatCircle, BookOpen, FileText, CheckCircle, NotePencil } from "@phosphor-icons/react";
import { Link } from "@/src/i18n/navigation";
import { useOnlineCount } from "@/src/hooks/use-online-count";
import type { HotNetworkItem } from "@/src/lib/hot-network";

const KIND_ICONS: Record<HotNetworkItem["kind"], typeof ChatCircle> = {
  topic: ChatCircle,
  Cours: BookOpen,
  Épreuve: FileText,
  Corrigé: CheckCircle,
  "Fiche de révision": NotePencil,
};

export function ActivitySidebar({
  questionsToday,
  answersToday,
  votesToday,
  hotItems,
}: {
  questionsToday: number;
  answersToday: number;
  votesToday: number;
  hotItems?: HotNetworkItem[];
}) {
  const t = useTranslations("home");
  const online = useOnlineCount();

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/60">
      <h2 className="font-black">{t("communityActivity")}</h2>
      <p className="text-sm">🟢 {t("onlineCount", { count: online })}</p>
      <p className="text-sm text-neutral-500">{t("questionsToday", { count: questionsToday })}</p>
      <p className="text-sm text-neutral-500">{t("answersToday", { count: answersToday })}</p>
      <p className="text-sm text-neutral-500">{t("votesToday", { count: votesToday })}</p>

      {hotItems && hotItems.length > 0 && (
        <>
          <hr className="my-1 border-neutral-200 dark:border-neutral-800" />
          <h2 className="font-black">{t("hotNetwork")}</h2>
          <ul className="flex flex-col gap-2">
            {hotItems.map((item) => {
              const Icon = KIND_ICONS[item.kind] ?? BookOpen;
              return (
                <li key={`${item.kind}-${item.id}`}>
                  <Link
                    href={item.href}
                    className="flex min-h-11 items-start gap-2 py-0.5 text-sm text-accent-blue hover:underline"
                  >
                    <Icon size={14} className="mt-1 shrink-0 text-neutral-400" />
                    <span className="line-clamp-2">{item.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
