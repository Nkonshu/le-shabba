import { getTranslations } from "next-intl/server";
import { createClient } from "@/src/utils/supabase/server";
import { SelectionCard } from "@/src/components/library/selection-card";
import { DocumentCard, type DocumentCardData } from "@/src/components/library/document-card";
import { Link } from "@/src/i18n/navigation";
import { CaretLeft } from "@phosphor-icons/react/dist/ssr";

const STATUS_RANK: Record<string, number> = {
  staff_verified: 0,
  community_verified: 1,
  unverified: 2,
};

export async function FavoritesDocuments({
  userId,
  level,
  subject,
}: {
  userId: string;
  level?: string;
  subject?: string;
}) {
  const supabase = await createClient();
  const t = await getTranslations("library");

  const { data: favRows } = await supabase
    .from("favorites")
    .select("target_id")
    .eq("user_id", userId)
    .eq("target_type", "document");
  const favIds = (favRows ?? []).map((f) => f.target_id);

  if (favIds.length === 0) {
    return <EmptyState text={t("emptyFavoriteDocuments")} />;
  }

  if (!level) {
    const { data } = await supabase
      .from("documents")
      .select("level_id, education_levels(label, sort_order)")
      .in("id", favIds)
      .neq("status", "removed")
      .neq("status", "flagged");

    const levelsMap = new Map<string, { label: string; sort_order: number }>();
    for (const row of data ?? []) {
      const lvl = row.education_levels as unknown as { label: string; sort_order: number } | null;
      if (row.level_id && lvl) levelsMap.set(row.level_id, lvl);
    }
    const levels = [...levelsMap.entries()].sort((a, b) => a[1].sort_order - b[1].sort_order);

    if (levels.length === 0) return <EmptyState text={t("emptyFavoriteDocuments")} />;

    return (
      <div className="flex flex-col gap-2">
        {levels.map(([id, lvl]) => (
          <SelectionCard key={id} icon="level" label={lvl.label} href={`/favoris?tab=documents&level=${id}`} />
        ))}
      </div>
    );
  }

  if (!subject) {
    const { data } = await supabase
      .from("documents")
      .select("subject")
      .in("id", favIds)
      .eq("level_id", level)
      .neq("status", "removed")
      .neq("status", "flagged");

    const counts = new Map<string, number>();
    for (const row of data ?? []) {
      counts.set(row.subject, (counts.get(row.subject) ?? 0) + 1);
    }
    const subjects = [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));

    return (
      <div className="flex flex-col gap-4">
        <BackLink href="/favoris?tab=documents" label={t("back")} />
        {subjects.length === 0 ? (
          <EmptyState text={t("emptyFavoriteDocuments")} />
        ) : (
          <div className="flex flex-col gap-2">
            {subjects.map(([name, count]) => (
              <SelectionCard
                key={name}
                icon="subject"
                label={name}
                count={count}
                href={`/favoris?tab=documents&level=${level}&subject=${encodeURIComponent(name)}`}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const { data: docs } = await supabase
    .from("documents")
    .select(
      "id, title, type, status, subject, year, votes_count, views_count, favorites_count, downloads_count, created_at, related_document_id, level:education_levels(label), country:countries(code), related_document:documents!related_document_id(title, type)"
    )
    .in("id", favIds)
    .eq("level_id", level)
    .eq("subject", subject)
    .neq("status", "removed")
    .neq("status", "flagged");

  const sorted = [...(docs ?? [])].sort(
    (a, b) =>
      (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9) ||
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const docIds = sorted.map((d) => d.id);
  const { data: votes } = docIds.length
    ? await supabase
        .from("votes")
        .select("target_id, value")
        .eq("user_id", userId)
        .eq("target_type", "document")
        .in("target_id", docIds)
    : { data: [] as { target_id: string; value: number }[] };
  const voteByDoc = new Map((votes ?? []).map((v) => [v.target_id, v.value as 1 | -1]));

  return (
    <div className="flex flex-col gap-4">
      <BackLink href={`/favoris?tab=documents&level=${level}`} label={t("back")} />
      {sorted.length === 0 ? (
        <EmptyState text={t("emptyFavoriteDocuments")} />
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((doc) => (
            <DocumentCard
              key={doc.id}
              userId={userId}
              document={{
                ...(doc as unknown as DocumentCardData),
                userVote: voteByDoc.get(doc.id) ?? null,
                isFavorited: true,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="flex min-h-11 w-fit items-center gap-1 text-sm text-neutral-500">
      <CaretLeft size={16} />
      {label}
    </Link>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="rounded-xl bg-neutral-50 p-6 text-center text-sm text-neutral-500 dark:bg-neutral-900">{text}</p>;
}
