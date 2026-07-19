import { useLocale, useTranslations } from "next-intl";
import { getRank } from "@/src/lib/reputation";
import { formatPoints } from "@/src/lib/format";

const RANK_STYLES: Record<string, string> = {
  beginner: "bg-neutral-100 text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400",
  curious: "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300",
  sentinel: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300",
  tutor: "bg-orange-50 text-accent-orange dark:bg-orange-950 dark:text-orange-300",
  valedictorian: "bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-300",
  legend: "bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 dark:from-amber-950 dark:to-orange-950 dark:text-amber-300",
};

// C.5 : pedigrée bref, toujours visible directement (jamais caché derrière un hover/clic) partout où
// un auteur apparaît — rang + points exacts + décompte de badges par palier.
export function RankBadge({
  points,
  badgesBronze,
  badgesArgent,
  badgesOr,
  size = "sm",
}: {
  points: number;
  badgesBronze: number;
  badgesArgent: number;
  badgesOr: number;
  size?: "sm" | "md";
}) {
  const t = useTranslations("reputation");
  const locale = useLocale();
  const rank = getRank(points);
  const hasBadges = badgesOr > 0 || badgesArgent > 0 || badgesBronze > 0;

  return (
    <span className={`inline-flex flex-wrap items-center gap-1.5 ${size === "md" ? "text-sm" : "text-[11px]"}`}>
      <span className={`rounded-full px-1.5 py-0.5 font-medium ${RANK_STYLES[rank.key]}`}>{t(`ranks.${rank.key}`)}</span>
      <span className="font-medium text-neutral-500 dark:text-neutral-400">
        {t("pointsLabel", { points: formatPoints(points, locale) })}
      </span>
      {hasBadges && (
        <span className="text-neutral-400">
          {badgesOr > 0 && `🥇${badgesOr} `}
          {badgesArgent > 0 && `🥈${badgesArgent} `}
          {badgesBronze > 0 && `🥉${badgesBronze}`}
        </span>
      )}
    </span>
  );
}
