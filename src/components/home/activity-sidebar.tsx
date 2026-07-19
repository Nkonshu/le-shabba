"use client";

import { useTranslations } from "next-intl";
import { useOnlineCount } from "@/src/hooks/use-online-count";

export function ActivitySidebar({
  questionsToday,
  answersToday,
  votesToday,
}: {
  questionsToday: number;
  answersToday: number;
  votesToday: number;
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
    </div>
  );
}
