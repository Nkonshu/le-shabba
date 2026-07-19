import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/src/utils/supabase/server";
import { getCurrentProfile, getCurrentUser } from "@/src/lib/dal";
import { ReportButton } from "@/src/components/moderation/report-button";
import { RankBadge } from "@/src/components/reputation/rank-badge";
import { RankProgress } from "@/src/components/reputation/rank-progress";
import { BadgesGrid } from "@/src/components/reputation/badges-grid";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const t = await getTranslations("profile");
  const viewer = await getCurrentUser();
  const viewerProfile = await getCurrentProfile();
  const canReport = Boolean(
    viewerProfile &&
      viewerProfile.id !== id &&
      (["admin", "super_admin"].includes(viewerProfile.role) || viewerProfile.genie_points >= 1200)
  );

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, full_name, avatar_url, bio, created_at, genie_points, badges_bronze, badges_argent, badges_or, current_streak, longest_streak"
    )
    .eq("id", id)
    .maybeSingle();

  if (!profile) {
    notFound();
  }

  const [{ data: allBadges }, { data: earnedBadges }, { count: docsCount }, { count: topicsCount }, { count: answersCount }] =
    await Promise.all([
      supabase.from("badges").select("id, key, label, description, tier").order("tier"),
      supabase.from("user_badges").select("badge_id, earned_at").eq("user_id", id),
      supabase.from("documents").select("id", { count: "exact", head: true }).eq("author_id", id).neq("status", "removed"),
      supabase.from("forum_topics").select("id", { count: "exact", head: true }).eq("author_id", id),
      supabase.from("forum_answers").select("id", { count: "exact", head: true }).eq("author_id", id),
    ]);

  const earnedByBadgeId = new Map((earnedBadges ?? []).map((b) => [b.badge_id, b.earned_at as string]));
  const contributionsCount = (docsCount ?? 0) + (topicsCount ?? 0) + (answersCount ?? 0);

  const memberSince = new Date(profile.created_at).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 px-4 py-10">
      <div className="flex items-center gap-4">
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div className="h-16 w-16 rounded-full bg-neutral-100 dark:bg-neutral-800" />
        )}
        <div className="flex-1">
          <h1 className="text-xl font-black">{profile.full_name ?? t("anonymous")}</h1>
          <p className="text-[10px] text-neutral-400">{t("memberSince", { date: memberSince })}</p>
        </div>
        <ReportButton targetType="user" targetId={profile.id} userId={viewer?.id ?? null} canReport={canReport} />
      </div>

      {profile.bio && <p className="reading-measure text-sm text-neutral-600 dark:text-neutral-300">{profile.bio}</p>}

      <div className="flex flex-col gap-2 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <RankBadge
          points={profile.genie_points}
          badgesBronze={profile.badges_bronze}
          badgesArgent={profile.badges_argent}
          badgesOr={profile.badges_or}
          size="md"
        />
        <RankProgress points={profile.genie_points} />
      </div>

      {profile.current_streak > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
          <span className="text-2xl">🔥</span>
          <div>
            <p className="font-medium">{t("streakDays", { count: profile.current_streak })}</p>
            <p className="text-[10px] text-neutral-400">{t("longestStreak", { count: profile.longest_streak })}</p>
          </div>
        </div>
      )}

      <p className="text-sm text-neutral-500">{t("contributionsCount", { count: contributionsCount })}</p>

      <div>
        <h2 className="mb-3 font-black">{t("badgesTitle")}</h2>
        <BadgesGrid badges={allBadges ?? []} earnedByBadgeId={earnedByBadgeId} />
      </div>
    </main>
  );
}
