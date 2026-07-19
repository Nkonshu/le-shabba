import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/src/utils/supabase/server";
import { getCurrentProfile, getCurrentUser } from "@/src/lib/dal";
import { VoteArrows } from "@/src/components/interactions/vote-arrows";
import { FavoriteStar } from "@/src/components/interactions/favorite-star";
import { FollowButton } from "@/src/components/forum/follow-button";
import { TopicDiscussion } from "@/src/components/forum/topic-discussion";
import { ReportButton } from "@/src/components/moderation/report-button";
import { ShareButton } from "@/src/components/share/share-button";
import { RankBadge } from "@/src/components/reputation/rank-badge";
import { ActivitySidebar } from "@/src/components/home/activity-sidebar";
import { getHotNetworkItems } from "@/src/lib/hot-network";
import { StatsPanel } from "@/src/components/interactions/stats-panel";
import { AttachmentLink } from "@/src/components/interactions/attachment-link";
import { TopicManageButtons } from "@/src/components/forum/topic-manage-buttons";
import type { AnswerData } from "@/src/components/forum/answer-card";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: topic } = await supabase.from("forum_topics").select("title, subject").eq("id", id).maybeSingle();
  if (!topic) return {};

  const description = `${topic.subject} — Le Shabba`;
  return {
    title: topic.title,
    description,
    openGraph: {
      title: topic.title,
      description,
      images: ["/og-image.png"],
      url: `/forum/${id}`,
    },
  };
}

export default async function TopicPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("forum");
  const ti = await getTranslations("interactions");
  const user = await getCurrentUser();
  const profile = await getCurrentProfile();
  const isStaff = Boolean(profile && ["admin", "super_admin"].includes(profile.role));
  const canReport = Boolean(profile && (isStaff || profile.genie_points >= 1200));

  const supabase = await createClient();
  const { data: topic } = await supabase
    .from("forum_topics")
    .select(
      "id, title, content, subject, status, canonical_topic_id, votes_count, views_count, favorites_count, attachment_url, created_at, tags, author_id, level:education_levels(label), author:profiles!forum_topics_author_id_fkey(full_name, avatar_url, genie_points, badges_bronze, badges_argent, badges_or)"
    )
    .eq("id", id)
    .maybeSingle();

  if (!topic) {
    notFound();
  }

  const { data: lastVersion } = await supabase
    .from("topic_versions")
    .select("created_at")
    .eq("topic_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: answers } = await supabase
    .from("forum_answers")
    .select(
      "id, topic_id, parent_id, author_id, type, content, attachment_url, is_solution, is_flagged, votes_count, favorites_count, cited_answer_id, last_moderated_by, created_at, author:profiles!forum_answers_author_id_fkey(id, full_name, avatar_url, genie_points, badges_bronze, badges_argent, badges_or)"
    )
    .eq("topic_id", id)
    .order("created_at", { ascending: true });

  const answerIds = (answers ?? []).map((a) => a.id);
  let userVoteTopic: 1 | -1 | null = null;
  let isFavoritedTopic = false;
  let isSubscribed = false;
  const voteByAnswer = new Map<string, 1 | -1>();
  const favoritedAnswers = new Set<string>();

  if (user) {
    const [{ data: topicVote }, { data: topicFav }, { data: sub }, { data: answerVotes }, { data: answerFavs }] =
      await Promise.all([
        supabase.from("votes").select("value").eq("user_id", user.id).eq("target_type", "topic").eq("target_id", id).maybeSingle(),
        supabase.from("favorites").select("id").eq("user_id", user.id).eq("target_type", "topic").eq("target_id", id).maybeSingle(),
        supabase.from("topic_subscriptions").select("id").eq("user_id", user.id).eq("topic_id", id).maybeSingle(),
        answerIds.length
          ? supabase.from("votes").select("target_id, value").eq("user_id", user.id).eq("target_type", "answer").in("target_id", answerIds)
          : Promise.resolve({ data: [] as { target_id: string; value: number }[] }),
        answerIds.length
          ? supabase.from("favorites").select("target_id").eq("user_id", user.id).eq("target_type", "answer").in("target_id", answerIds)
          : Promise.resolve({ data: [] as { target_id: string }[] }),
      ]);
    if (topicVote) userVoteTopic = topicVote.value as 1 | -1;
    isFavoritedTopic = Boolean(topicFav);
    isSubscribed = Boolean(sub);
    for (const v of answerVotes ?? []) voteByAnswer.set(v.target_id, v.value as 1 | -1);
    for (const f of answerFavs ?? []) favoritedAnswers.add(f.target_id);
  }

  const enriched = (answers ?? []).map((a) => ({
    ...(a as unknown as AnswerData),
    userVote: voteByAnswer.get(a.id) ?? null,
    isFavorited: favoritedAnswers.has(a.id),
  }));

  const proposals = enriched
    .filter((a) => a.parent_id === null)
    .map((proposal) => ({
      ...proposal,
      comments: enriched.filter((a) => a.parent_id === proposal.id),
    }));

  const level = topic.level as unknown as { label: string } | null;
  const author = topic.author as unknown as {
    full_name: string | null;
    avatar_url: string | null;
    genie_points: number;
    badges_bronze: number;
    badges_argent: number;
    badges_or: number;
  } | null;
  const isSolved = proposals.some((p) => p.is_solution);
  const hasAcceptedOrVotedAnswer = proposals.some((p) => p.is_solution || p.votes_count > 0);
  const canEditTopic = Boolean(user && (user.id === topic.author_id || isStaff));
  const canDeleteTopic = Boolean(user && (isStaff || (user.id === topic.author_id && !hasAcceptedOrVotedAnswer)));

  const startOfDay = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
  const [{ count: questionsToday }, { count: answersToday }, { count: votesToday }, hotItems] = await Promise.all([
    supabase.from("forum_topics").select("id", { count: "exact", head: true }).gte("created_at", startOfDay),
    supabase.from("forum_answers").select("id", { count: "exact", head: true }).gte("created_at", startOfDay),
    supabase.from("votes").select("id", { count: "exact", head: true }).gte("created_at", startOfDay),
    getHotNetworkItems(),
  ]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 lg:flex-row lg:items-start">
    <main className="flex flex-1 flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <h1 className="text-xl font-black">{topic.title}</h1>
        <div className="flex items-center gap-1">
          <TopicManageButtons
            topicId={topic.id}
            initialTitle={topic.title}
            initialContent={topic.content}
            canEdit={canEditTopic}
            canDelete={canDeleteTopic}
            deleteBlockedReason={hasAcceptedOrVotedAnswer ? t("deleteBlockedHasAnswers") : null}
            basePath="/forum"
          />
          <ReportButton targetType="topic" targetId={topic.id} userId={user?.id ?? null} canReport={canReport} />
          <ShareButton
            contentType="topic"
            contentId={topic.id}
            path={`/forum/${topic.id}`}
            title={topic.title}
            isSolved={isSolved}
            userId={user?.id ?? null}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex shrink-0 flex-col items-center gap-1">
          <VoteArrows
            targetType="topic"
            targetId={topic.id}
            userId={user?.id ?? null}
            initialCount={topic.votes_count}
            initialVote={userVoteTopic}
          />
          <FavoriteStar targetType="topic" targetId={topic.id} userId={user?.id ?? null} initialFavorited={isFavoritedTopic} />
        </div>

        <div className="flex flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {level && (
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] dark:bg-neutral-900">{level.label}</span>
            )}
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              {topic.subject}
            </span>
            {topic.status === "closed_duplicate" && (
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-500 dark:bg-neutral-900">
                {t("closedDuplicate")}
              </span>
            )}
            {((topic.tags as string[] | null) ?? []).map((tag) => (
              <span key={tag} className="rounded-full bg-neutral-50 px-2 py-0.5 text-[10px] text-neutral-400 dark:bg-neutral-950">
                #{tag}
              </span>
            ))}
          </div>

          <p className="whitespace-pre-wrap text-sm">{topic.content}</p>

          {topic.attachment_url && <AttachmentLink url={topic.attachment_url as string} />}

          <div className="flex justify-end">
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-neutral-100 px-2 py-1.5 text-[10px] text-neutral-400 dark:border-neutral-900">
              <span className="font-medium text-neutral-500">{author?.full_name ?? t("anonymous")}</span>
              {author && (
                <RankBadge
                  points={author.genie_points}
                  badgesBronze={author.badges_bronze}
                  badgesArgent={author.badges_argent}
                  badgesOr={author.badges_or}
                />
              )}
              <span>· {new Date(topic.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-neutral-400">{t("proposalsCount", { count: proposals.length })}</span>
        <FollowButton topicId={topic.id} userId={user?.id ?? null} initialSubscribed={isSubscribed} />
      </div>

      <TopicDiscussion
        topicId={topic.id}
        topicTitle={topic.title}
        topicAuthorId={topic.author_id}
        proposals={proposals}
        userId={user?.id ?? null}
        isStaff={isStaff}
        canReport={canReport}
      />
    </main>

    <aside className="flex flex-col gap-4 lg:w-72 lg:shrink-0 lg:border-l lg:border-neutral-100 lg:pl-6 dark:lg:border-neutral-900">
      <StatsPanel
        rows={[
          { label: ti("statAsked"), value: new Date(topic.created_at).toLocaleDateString() },
          ...(lastVersion ? [{ label: ti("statModified"), value: new Date(lastVersion.created_at).toLocaleDateString() }] : []),
          { label: ti("statViews"), value: String(topic.views_count) },
          { label: ti("statFavorites"), value: String(topic.favorites_count) },
        ]}
      />
      <ActivitySidebar
        questionsToday={questionsToday ?? 0}
        answersToday={answersToday ?? 0}
        votesToday={votesToday ?? 0}
        hotItems={hotItems}
      />
    </aside>
    </div>
  );
}
