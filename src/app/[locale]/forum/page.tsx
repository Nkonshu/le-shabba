import { getTranslations } from "next-intl/server";
import { createClient } from "@/src/utils/supabase/server";
import { getCurrentUser } from "@/src/lib/dal";
import { Link } from "@/src/i18n/navigation";
import { TopicCard, type TopicCardData } from "@/src/components/forum/topic-card";
import { ActivitySidebar } from "@/src/components/home/activity-sidebar";

export default async function ForumPage() {
  const t = await getTranslations("forum");
  const supabase = await createClient();
  const user = await getCurrentUser();

  const startOfDay = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
  const [{ count: questionsToday }, { count: answersToday }, { count: votesToday }] = await Promise.all([
    supabase.from("forum_topics").select("id", { count: "exact", head: true }).gte("created_at", startOfDay),
    supabase.from("forum_answers").select("id", { count: "exact", head: true }).gte("created_at", startOfDay),
    supabase.from("votes").select("id", { count: "exact", head: true }).gte("created_at", startOfDay),
  ]);

  const { data: topics } = await supabase
    .from("forum_topics")
    .select(
      "id, title, content, subject, status, votes_count, views_count, created_at, tags, level:education_levels(label), author:profiles(full_name, avatar_url), forum_answers(count)"
    )
    .order("created_at", { ascending: false })
    .limit(30);

  const topicIds = (topics ?? []).map((t2) => t2.id);
  const [{ data: solvedRows }, votesResult, favsResult] = await Promise.all([
    topicIds.length
      ? supabase.from("forum_answers").select("topic_id").eq("is_solution", true).in("topic_id", topicIds)
      : Promise.resolve({ data: [] as { topic_id: string }[] }),
    user && topicIds.length
      ? supabase
          .from("votes")
          .select("target_id, value")
          .eq("user_id", user.id)
          .eq("target_type", "topic")
          .in("target_id", topicIds)
      : Promise.resolve({ data: [] as { target_id: string; value: number }[] }),
    user && topicIds.length
      ? supabase
          .from("favorites")
          .select("target_id")
          .eq("user_id", user.id)
          .eq("target_type", "topic")
          .in("target_id", topicIds)
      : Promise.resolve({ data: [] as { target_id: string }[] }),
  ]);

  const solvedSet = new Set((solvedRows ?? []).map((r) => r.topic_id));
  const voteByTopic = new Map((votesResult.data ?? []).map((v) => [v.target_id, v.value as 1 | -1]));
  const favoritedTopics = new Set((favsResult.data ?? []).map((f) => f.target_id));

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 lg:flex-row lg:items-start">
      <main className="flex flex-1 flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black">{t("title")}</h1>
          {user && (
            <Link
              href="/forum/nouvelle-question"
              className="min-h-11 rounded-xl bg-accent-blue px-4 text-sm font-medium leading-[2.75rem] text-white"
            >
              {t("askQuestion")}
            </Link>
          )}
        </div>

        {(topics ?? []).length === 0 ? (
          <p className="rounded-xl bg-neutral-50 p-6 text-center text-sm text-neutral-500 dark:bg-neutral-900">
            {t("emptyTopics")}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {(topics ?? []).map((topic) => {
              const answersCount = Array.isArray(topic.forum_answers)
                ? ((topic.forum_answers[0] as unknown as { count: number } | undefined)?.count ?? 0)
                : 0;
              return (
                <TopicCard
                  key={topic.id}
                  userId={user?.id ?? null}
                  topic={{
                    ...(topic as unknown as TopicCardData),
                    answersCount,
                    hasSolution: solvedSet.has(topic.id),
                    userVote: voteByTopic.get(topic.id) ?? null,
                    isFavorited: favoritedTopics.has(topic.id),
                  }}
                />
              );
            })}
          </div>
        )}
      </main>

      <aside className="lg:w-72 lg:shrink-0">
        <ActivitySidebar
          questionsToday={questionsToday ?? 0}
          answersToday={answersToday ?? 0}
          votesToday={votesToday ?? 0}
        />
      </aside>
    </div>
  );
}
