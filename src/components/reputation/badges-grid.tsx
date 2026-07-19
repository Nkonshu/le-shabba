import { useTranslations } from "next-intl";

type Badge = { id: string; key: string; label: string; description: string; tier: "bronze" | "argent" | "or" };

const TIER_ICON: Record<Badge["tier"], string> = { bronze: "🥉", argent: "🥈", or: "🥇" };

// Annexe A.4 "États UI" : badges affichés en grille, grisés/non obtenus vs. colorés/obtenus — donne un
// objectif visible même sur ceux qui manquent, pas seulement ceux déjà décrochés.
export function BadgesGrid({
  badges,
  earnedByBadgeId,
}: {
  badges: Badge[];
  earnedByBadgeId: Map<string, string>;
}) {
  const t = useTranslations("profile");

  if (badges.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-2">
      {badges.map((badge) => {
        const earnedAt = earnedByBadgeId.get(badge.id);
        return (
          <div
            key={badge.id}
            title={badge.description}
            className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-center ${
              earnedAt
                ? "border-neutral-200 dark:border-neutral-800"
                : "border-neutral-100 opacity-40 grayscale dark:border-neutral-900"
            }`}
          >
            <span className="text-2xl">{TIER_ICON[badge.tier]}</span>
            <span className="text-[10px] font-medium leading-tight">{badge.label}</span>
            {earnedAt ? (
              <span className="text-[9px] text-neutral-400">{new Date(earnedAt).toLocaleDateString()}</span>
            ) : (
              <span className="text-[9px] text-neutral-400">{t("badgeNotEarned")}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
