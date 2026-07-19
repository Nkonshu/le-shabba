import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/src/utils/supabase/server";
import { requireUser } from "@/src/lib/dal";
import { getSchoolBySubdomain, getMembership } from "@/src/lib/schools";
import { Link } from "@/src/i18n/navigation";
import { TopicCard, type TopicCardData } from "@/src/components/forum/topic-card";

export default async function SchoolForumPage({
  params,
}: {
  params: Promise<{ locale: string; subdomain: string }>;
}) {
  const { locale, subdomain } = await params;
  const user = await requireUser(locale);
  const t = await getTranslations("schools");

  const school = await getSchoolBySubdomain(subdomain);
  if (!school) notFound();

  const membership = await getMembership(school.id, user.id);
  if (!membership) {
    return (
      <main className="mx-auto flex max-w-sm flex-col gap-4 px-4 py-10 text-center">
        <p className="text-sm text-neutral-500">{t("notMember")}</p>
      </main>
    );
  }

  const supabase = await createClient();
  const { data: topics } = await supabase
    .from("forum_topics")
    .select(
      "id, title, content, subject, status, votes_count, views_count, created_at, tags, level:education_levels(label), author:profiles!forum_topics_author_id_fkey(full_name, avatar_url), forum_answers(count)"
    )
    .eq("school_id", school.id)
    .order("created_at", { ascending: false })
    .limit(30);

  const topicIds = (topics ?? []).map((t2) => t2.id);
  const [{ data: solvedRows }, votesResult, favsResult] = await Promise.all([
    topicIds.length
      ? supabase.from("forum_answers").select("topic_id").eq("is_solution", true).in("topic_id", topicIds)
      : Promise.resolve({ data: [] as { topic_id: string }[] }),
    topicIds.length
      ? supabase
          .from("votes")
          .select("target_id, value")
          .eq("user_id", user.id)
          .eq("target_type", "topic")
          .in("target_id", topicIds)
      : Promise.resolve({ data: [] as { target_id: string; value: number }[] }),
    topicIds.length
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
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">{school.name}</h1>
        <Link
          href={`/ecole/${subdomain}/forum/nouvelle-question`}
          className="min-h-11 rounded-xl bg-accent-blue px-4 text-sm font-medium leading-[2.75rem] text-white"
        >
          {t("askQuestion")}
        </Link>
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
                userId={user.id}
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

      <Link href="/" className="text-sm text-accent-blue">
        {t("viewPublicLibrary")}
      </Link>
    </main>
  );
}
