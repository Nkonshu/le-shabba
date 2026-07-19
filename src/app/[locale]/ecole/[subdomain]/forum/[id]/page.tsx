import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/src/utils/supabase/server";
import { getCurrentProfile, requireUser } from "@/src/lib/dal";
import { getSchoolBySubdomain, getMembership } from "@/src/lib/schools";
import { VoteArrows } from "@/src/components/interactions/vote-arrows";
import { FavoriteStar } from "@/src/components/interactions/favorite-star";
import { FollowButton } from "@/src/components/forum/follow-button";
import { TopicDiscussion } from "@/src/components/forum/topic-discussion";
import { ReportButton } from "@/src/components/moderation/report-button";
import { RankBadge } from "@/src/components/reputation/rank-badge";
import type { AnswerData } from "@/src/components/forum/answer-card";

export default async function SchoolTopicPage({
  params,
}: {
  params: Promise<{ locale: string; subdomain: string; id: string }>;
}) {
  const { locale, subdomain, id } = await params;
  const user = await requireUser(locale);
  const t = await getTranslations("forum");
  const tSchools = await getTranslations("schools");

  const school = await getSchoolBySubdomain(subdomain);
  if (!school) notFound();

  const membership = await getMembership(school.id, user.id);
  if (!membership) {
    return (
      <main className="mx-auto max-w-sm px-4 py-10">
        <p className="text-sm text-neutral-500">{tSchools("notMember")}</p>
      </main>
    );
  }

  const profile = await getCurrentProfile();
  const isStaff = Boolean(profile && ["admin", "super_admin"].includes(profile.role));
  const canReport = Boolean(profile && (isStaff || profile.genie_points >= 1200));

  const supabase = await createClient();
  const { data: topic } = await supabase
    .from("forum_topics")
    .select(
      "id, title, content, subject, status, canonical_topic_id, votes_count, views_count, created_at, tags, author_id, school_id, level:education_levels(label), author:profiles(full_name, avatar_url, genie_points, badges_bronze, badges_argent, badges_or)"
    )
    .eq("id", id)
    .eq("school_id", school.id)
    .maybeSingle();

  if (!topic) {
    notFound();
  }

  const { data: answers } = await supabase
    .from("forum_answers")
    .select(
      "id, topic_id, parent_id, author_id, type, content, attachment_url, is_solution, is_flagged, votes_count, cited_answer_id, last_moderated_by, created_at, author:profiles!forum_answers_author_id_fkey(id, full_name, avatar_url, genie_points, badges_bronze, badges_argent, badges_or)"
    )
    .eq("topic_id", id)
    .order("created_at", { ascending: true });

  const answerIds = (answers ?? []).map((a) => a.id);
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

  const userVoteTopic = (topicVote?.value as 1 | -1 | undefined) ?? null;
  const isFavoritedTopic = Boolean(topicFav);
  const isSubscribed = Boolean(sub);
  const voteByAnswer = new Map((answerVotes ?? []).map((v) => [v.target_id, v.value as 1 | -1]));
  const favoritedAnswers = new Set((answerFavs ?? []).map((f) => f.target_id));

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

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-10">
      <div className="flex items-start justify-between gap-2">
        <h1 className="text-xl font-black">{topic.title}</h1>
        <div className="flex items-center gap-1">
          <FavoriteStar targetType="topic" targetId={topic.id} userId={user.id} initialFavorited={isFavoritedTopic} />
          <ReportButton targetType="topic" targetId={topic.id} userId={user.id} canReport={canReport} />
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex shrink-0 flex-col items-center gap-2">
          <VoteArrows
            targetType="topic"
            targetId={topic.id}
            userId={user.id}
            initialCount={topic.votes_count}
            initialVote={userVoteTopic}
          />
          <span className="text-center text-[10px] text-neutral-400">{t("viewsCount", { count: topic.views_count })}</span>
        </div>

        <div className="flex flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {level && (
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] dark:bg-neutral-900">{level.label}</span>
            )}
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              {topic.subject}
            </span>
            {((topic.tags as string[] | null) ?? []).map((tag) => (
              <span key={tag} className="rounded-full bg-neutral-50 px-2 py-0.5 text-[10px] text-neutral-400 dark:bg-neutral-950">
                #{tag}
              </span>
            ))}
          </div>

          <p className="whitespace-pre-wrap text-sm">{topic.content}</p>

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
        <FollowButton topicId={topic.id} userId={user.id} initialSubscribed={isSubscribed} />
      </div>

      <TopicDiscussion
        topicId={topic.id}
        topicTitle={topic.title}
        topicAuthorId={topic.author_id}
        proposals={proposals}
        userId={user.id}
        isStaff={isStaff}
        canReport={canReport}
        schoolId={school.id}
      />
    </main>
  );
}
