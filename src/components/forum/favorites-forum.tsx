import { getTranslations } from "next-intl/server";
import { createClient } from "@/src/utils/supabase/server";
import { TopicCard, type TopicCardData } from "@/src/components/forum/topic-card";

export async function FavoritesForum({ userId }: { userId: string }) {
  const supabase = await createClient();
  const t = await getTranslations("favorites");

  const { data: favRows } = await supabase
    .from("favorites")
    .select("target_id")
    .eq("user_id", userId)
    .eq("target_type", "topic");
  const topicIds = (favRows ?? []).map((f) => f.target_id);

  if (topicIds.length === 0) {
    return (
      <p className="rounded-xl bg-neutral-50 p-6 text-center text-sm text-neutral-500 dark:bg-neutral-900">
        {t("emptyFavoriteForum")}
      </p>
    );
  }

  const { data: topics } = await supabase
    .from("forum_topics")
    .select(
      "id, title, content, subject, status, votes_count, views_count, created_at, tags, level:education_levels(label), author:profiles!forum_topics_author_id_fkey(full_name, avatar_url), forum_answers(count)"
    )
    .in("id", topicIds)
    .order("created_at", { ascending: false });

  const [{ data: solvedRows }, { data: votes }] = await Promise.all([
    supabase.from("forum_answers").select("topic_id").eq("is_solution", true).in("topic_id", topicIds),
    supabase.from("votes").select("target_id, value").eq("user_id", userId).eq("target_type", "topic").in("target_id", topicIds),
  ]);
  const solvedSet = new Set((solvedRows ?? []).map((r) => r.topic_id));
  const voteByTopic = new Map((votes ?? []).map((v) => [v.target_id, v.value as 1 | -1]));

  return (
    <div className="flex flex-col gap-3">
      {(topics ?? []).map((topic) => {
        const answersCount = Array.isArray(topic.forum_answers)
          ? ((topic.forum_answers[0] as unknown as { count: number } | undefined)?.count ?? 0)
          : 0;
        return (
          <TopicCard
            key={topic.id}
            userId={userId}
            topic={{
              ...(topic as unknown as TopicCardData),
              answersCount,
              hasSolution: solvedSet.has(topic.id),
              userVote: voteByTopic.get(topic.id) ?? null,
              isFavorited: true,
            }}
          />
        );
      })}
    </div>
  );
}
