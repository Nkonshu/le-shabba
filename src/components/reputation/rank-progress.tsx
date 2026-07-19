import { useTranslations } from "next-intl";
import { getRank } from "@/src/lib/reputation";

// Annexe A.4 : le manque de points est affiché de façon proactive ("Encore 240 points pour devenir
// Tuteur"), pas seulement au moment où une action bloquée est tentée.
export function RankProgress({ points }: { points: number }) {
  const t = useTranslations("reputation");
  const rank = getRank(points);

  if (!rank.next) {
    return <p className="text-[10px] text-neutral-400">{t("maxRankReached")}</p>;
  }

  const segmentSize = rank.next.min - rank.min;
  const progressInSegment = points - rank.min;
  const percent = Math.min(100, Math.max(0, (progressInSegment / segmentSize) * 100));

  return (
    <div className="flex flex-col gap-1">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
        <div className="h-full rounded-full bg-accent-blue" style={{ width: `${percent}%` }} />
      </div>
      <p className="text-[10px] text-neutral-400">
        {t("pointsUntilNextRank", { points: rank.next.remaining, rank: t(`ranks.${rank.next.key}`) })}
      </p>
    </div>
  );
}
