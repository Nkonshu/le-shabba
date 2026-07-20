import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/src/utils/supabase/server";
import { getCurrentProfile, getCurrentUser } from "@/src/lib/dal";
import { DocumentCard, type DocumentCardData } from "@/src/components/library/document-card";
import { TopicCard, type TopicCardData } from "@/src/components/forum/topic-card";
import { ActivitySidebar } from "@/src/components/home/activity-sidebar";
import { MyProgressCard } from "@/src/components/reputation/my-progress-card";
import { SponsoredSlot } from "@/src/components/ads/sponsored-slot";

const DOC_SELECT =
  "id, title, type, status, subject, year, votes_count, views_count, favorites_count, downloads_count, created_at, related_document_id, level:education_levels(label), country:countries(code), related_document:documents!related_document_id(title, type)";

const TOPIC_SELECT =
  "id, title, content, subject, status, votes_count, views_count, favorites_count, created_at, tags, level:education_levels(label), author:profiles!forum_topics_author_id_fkey(full_name, avatar_url), forum_answers(count)";

function enrichTopics(rows: unknown[], solvedSet: Set<string>): TopicCardData[] {
  return (rows as Record<string, unknown>[]).map((row) => {
    const answers = row.forum_answers as { count: number }[] | undefined;
    return {
      ...(row as unknown as TopicCardData),
      answersCount: answers?.[0]?.count ?? 0,
      hasSolution: solvedSet.has(row.id as string),
    };
  });
}

export default async function HomePage() {
  const t = await getTranslations("home");
  const locale = await getLocale();
  const supabase = await createClient();
  const user = await getCurrentUser();
  const profile = await getCurrentProfile();

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: solvedTopicIdsRaw } = await supabase
    .from("forum_answers")
    .select("topic_id")
    .eq("is_solution", true);
  const solvedTopicIds = [...new Set((solvedTopicIdsRaw ?? []).map((r) => r.topic_id as string))];

  const [
    { count: topicsCount },
    { count: documentsCount },
    { data: latestDocs },
    { data: hotTopicsRaw },
    { data: impactfulRaw },
    { data: mostReadDocs },
    { count: questionsToday },
    { count: answersToday },
    { count: votesToday },
  ] = await Promise.all([
    supabase.from("forum_topics").select("id", { count: "exact", head: true }),
    supabase.from("documents").select("id", { count: "exact", head: true }).neq("status", "removed"),
    supabase.from("documents").select(DOC_SELECT).neq("status", "removed").order("created_at", { ascending: false }).limit(5),
    supabase
      .from("forum_topics")
      .select(TOPIC_SELECT)
      .gte("created_at", sevenDaysAgo)
      .order("views_count", { ascending: false })
      .limit(5),
    solvedTopicIds.length
      ? supabase
          .from("forum_topics")
          .select(TOPIC_SELECT)
          .in("id", solvedTopicIds)
          .gte("created_at", thirtyDaysAgo)
          .order("votes_count", { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] as unknown[] }),
    supabase.from("documents").select(DOC_SELECT).neq("status", "removed").order("views_count", { ascending: false }).limit(5),
    supabase.from("forum_topics").select("id", { count: "exact", head: true }).gte("created_at", startOfDay),
    supabase.from("forum_answers").select("id", { count: "exact", head: true }).gte("created_at", startOfDay),
    supabase.from("votes").select("id", { count: "exact", head: true }).gte("created_at", startOfDay),
  ]);

  const solvedSet = new Set(solvedTopicIds);
  const hotTopics = enrichTopics(hotTopicsRaw ?? [], solvedSet);
  const impactfulTopics = enrichTopics(impactfulRaw ?? [], solvedSet);

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 lg:flex-row lg:items-start">
      <div className="flex flex-1 flex-col gap-8">
        <div>
          <h1 className="text-2xl font-black">Le Shabba</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {t("topicsCount", { count: topicsCount ?? 0 })} · {t("documentsCount", { count: documentsCount ?? 0 })}
          </p>
        </div>

        <Section title={t("latestDocuments")}>
          {(latestDocs ?? []).length === 0 ? (
            <EmptySection text={t("noDocumentsYet")} />
          ) : (
            (latestDocs ?? []).map((doc) => (
              <DocumentCard key={doc.id} userId={user?.id ?? null} document={doc as unknown as DocumentCardData} />
            ))
          )}
        </Section>

        <SponsoredSlot placement="home_feed" locale={locale} />

        <Section title={t("hotTopics")}>
          {hotTopics.length === 0 ? (
            <EmptySection text={t("noTopicsYet")} />
          ) : (
            hotTopics.map((topic) => <TopicCard key={topic.id} userId={user?.id ?? null} topic={topic} />)
          )}
        </Section>

        <Section title={t("impactfulQuestions")}>
          {impactfulTopics.length === 0 ? (
            <EmptySection text={t("noImpactfulYet")} />
          ) : (
            impactfulTopics.map((topic) => <TopicCard key={topic.id} userId={user?.id ?? null} topic={topic} />)
          )}
        </Section>

        <Section title={t("mostReadDocuments")}>
          {(mostReadDocs ?? []).length === 0 ? (
            <EmptySection text={t("noDocumentsYet")} />
          ) : (
            (mostReadDocs ?? []).map((doc) => (
              <DocumentCard key={doc.id} userId={user?.id ?? null} document={doc as unknown as DocumentCardData} />
            ))
          )}
        </Section>
      </div>

      <aside className="flex flex-col gap-4 lg:w-72 lg:shrink-0 lg:border-l lg:border-neutral-100 lg:pl-6 dark:lg:border-neutral-900">
        {profile && <MyProgressCard profile={profile} />}
        <ActivitySidebar
          questionsToday={questionsToday ?? 0}
          answersToday={answersToday ?? 0}
          votesToday={votesToday ?? 0}
        />
      </aside>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-black">{title}</h2>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

function EmptySection({ text }: { text: string }) {
  return <p className="rounded-xl bg-neutral-50 p-6 text-center text-sm text-neutral-500 dark:bg-neutral-900">{text}</p>;
}
