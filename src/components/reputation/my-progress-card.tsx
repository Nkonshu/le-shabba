import { getTranslations } from "next-intl/server";
import { RankBadge } from "@/src/components/reputation/rank-badge";
import { RankProgress } from "@/src/components/reputation/rank-progress";
import type { Profile } from "@/src/lib/profile";

// Annexe A.4 : le compteur de série et le manque de points avant le prochain rang doivent être
// visibles sur le profil ET l'accueil, pas seulement au clic sur "Signaler" ou une action bloquée.
export async function MyProgressCard({ profile }: { profile: Profile }) {
  const t = await getTranslations("home");

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/60">
      <h2 className="font-black">{t("myProgress")}</h2>
      <RankBadge
        points={profile.genie_points}
        badgesBronze={profile.badges_bronze}
        badgesArgent={profile.badges_argent}
        badgesOr={profile.badges_or}
        size="md"
      />
      <RankProgress points={profile.genie_points} />
      {profile.current_streak > 0 && (
        <p className="text-sm">🔥 {t("streakDays", { count: profile.current_streak })}</p>
      )}
    </div>
  );
}
