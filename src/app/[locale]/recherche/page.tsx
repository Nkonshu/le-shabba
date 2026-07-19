import { getTranslations } from "next-intl/server";
import { createClient } from "@/src/utils/supabase/server";
import { getCurrentUser } from "@/src/lib/dal";
import { searchDocuments, searchTopics } from "@/src/lib/search";
import { DocumentCard, type DocumentCardData } from "@/src/components/library/document-card";
import { TopicCard, type TopicCardData } from "@/src/components/forum/topic-card";

const DOC_SELECT =
  "id, title, type, status, subject, year, votes_count, created_at, related_document_id, level:education_levels(label), country:countries(code), related_document:documents!related_document_id(title, type)";

const TOPIC_SELECT =
  "id, title, content, subject, status, votes_count, views_count, created_at, tags, level:education_levels(label), author:profiles(full_name, avatar_url), forum_answers(count)";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const t = await getTranslations("search");
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!q?.trim()) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-10">
        <h1 className="text-2xl font-black">{t("title")}</h1>
        <p className="text-sm text-neutral-500">{t("prompt")}</p>
      </main>
    );
  }

  const [docHits, topicHits] = await Promise.all([searchDocuments(q), searchTopics(q)]);
  const docIds = docHits.map((h) => h.id);
  const topicIds = topicHits.map((h) => h.id);

  const [{ data: docsRaw }, { data: topicsRaw }] = await Promise.all([
    docIds.length ? supabase.from("documents").select(DOC_SELECT).in("id", docIds) : Promise.resolve({ data: [] as unknown[] }),
    topicIds.length
      ? supabase.from("forum_topics").select(TOPIC_SELECT).in("id", topicIds)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  const docsById = new Map((docsRaw as { id: string }[] | null ?? []).map((d) => [d.id, d]));
  const orderedDocs = docIds.map((id) => docsById.get(id)).filter(Boolean) as unknown as DocumentCardData[];

  const { data: solvedRows } = topicIds.length
    ? await supabase.from("forum_answers").select("topic_id").eq("is_solution", true).in("topic_id", topicIds)
    : { data: [] as { topic_id: string }[] };
  const solvedSet = new Set((solvedRows ?? []).map((r) => r.topic_id));

  const topicsById = new Map((topicsRaw as { id: string }[] | null ?? []).map((tRow) => [tRow.id, tRow]));
  const orderedTopics = topicIds
    .map((id) => topicsById.get(id))
    .filter(Boolean)
    .map((row) => {
      const r = row as Record<string, unknown>;
      const answers = r.forum_answers as { count: number }[] | undefined;
      return {
        ...(r as unknown as TopicCardData),
        answersCount: answers?.[0]?.count ?? 0,
        hasSolution: solvedSet.has(r.id as string),
      };
    });

  let voteByDoc = new Map<string, 1 | -1>();
  let favoritedDocs = new Set<string>();
  let voteByTopic = new Map<string, 1 | -1>();
  let favoritedTopics = new Set<string>();

  if (user) {
    const [docVotes, docFavs, topicVotes, topicFavs] = await Promise.all([
      docIds.length
        ? supabase.from("votes").select("target_id, value").eq("user_id", user.id).eq("target_type", "document").in("target_id", docIds)
        : Promise.resolve({ data: [] as { target_id: string; value: number }[] }),
      docIds.length
        ? supabase.from("favorites").select("target_id").eq("user_id", user.id).eq("target_type", "document").in("target_id", docIds)
        : Promise.resolve({ data: [] as { target_id: string }[] }),
      topicIds.length
        ? supabase.from("votes").select("target_id, value").eq("user_id", user.id).eq("target_type", "topic").in("target_id", topicIds)
        : Promise.resolve({ data: [] as { target_id: string; value: number }[] }),
      topicIds.length
        ? supabase.from("favorites").select("target_id").eq("user_id", user.id).eq("target_type", "topic").in("target_id", topicIds)
        : Promise.resolve({ data: [] as { target_id: string }[] }),
    ]);
    voteByDoc = new Map((docVotes.data ?? []).map((v) => [v.target_id, v.value as 1 | -1]));
    favoritedDocs = new Set((docFavs.data ?? []).map((f) => f.target_id));
    voteByTopic = new Map((topicVotes.data ?? []).map((v) => [v.target_id, v.value as 1 | -1]));
    favoritedTopics = new Set((topicFavs.data ?? []).map((f) => f.target_id));
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-10">
      <h1 className="text-2xl font-black">{t("resultsFor", { query: q })}</h1>

      <section className="flex flex-col gap-3">
        <h2 className="font-black">{t("documentsSection")}</h2>
        {orderedDocs.length === 0 ? (
          <p className="text-sm text-neutral-500">{t("noResults")}</p>
        ) : (
          orderedDocs.map((doc) => (
            <DocumentCard
              key={doc.id}
              userId={user?.id ?? null}
              document={{ ...doc, userVote: voteByDoc.get(doc.id) ?? null, isFavorited: favoritedDocs.has(doc.id) }}
            />
          ))
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-black">{t("forumSection")}</h2>
        {orderedTopics.length === 0 ? (
          <p className="text-sm text-neutral-500">{t("noResults")}</p>
        ) : (
          orderedTopics.map((topic) => (
            <TopicCard
              key={topic.id}
              userId={user?.id ?? null}
              topic={{ ...topic, userVote: voteByTopic.get(topic.id) ?? null, isFavorited: favoritedTopics.has(topic.id) }}
            />
          ))
        )}
      </section>
    </main>
  );
}
