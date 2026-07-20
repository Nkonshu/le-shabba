import { CaretLeft } from "@phosphor-icons/react/dist/ssr";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/src/utils/supabase/server";
import { getCurrentProfile, getCurrentUser } from "@/src/lib/dal";
import { isCurrentlyBanned } from "@/src/lib/profile";
import { Link } from "@/src/i18n/navigation";
import { AuthGatedLink } from "@/src/components/auth/auth-gated-link";
import { SelectionCard } from "@/src/components/library/selection-card";
import { DocumentCard, type DocumentCardData } from "@/src/components/library/document-card";
import { SponsoredSlot, type SponsoredSlotPlacement } from "@/src/components/ads/sponsored-slot";

const STATUS_RANK: Record<string, number> = {
  staff_verified: 0,
  community_verified: 1,
  unverified: 2,
};

const PLACEMENT_BY_TYPE: Record<string, SponsoredSlotPlacement> = {
  Cours: "courses_list",
  Épreuve: "exams_list",
  "Fiche de révision": "revision_sheets_list",
};

export async function DocumentLibrary({
  documentType,
  basePath,
  title,
  searchParams,
}: {
  documentType: string;
  basePath: string;
  title: string;
  searchParams: { level?: string; subject?: string };
}) {
  const supabase = await createClient();
  const t = await getTranslations("library");
  const publishUser = await getCurrentUser();
  const profile = await getCurrentProfile();
  const canPublish = !profile || !isCurrentlyBanned(profile);

  const level = searchParams.level;
  const subject = searchParams.subject;

  const publishButton = canPublish ? (
    <AuthGatedLink
      href={`/publier?type=${encodeURIComponent(documentType)}`}
      userId={publishUser?.id ?? null}
      className="min-h-11 shrink-0 rounded-xl bg-accent-blue px-4 text-sm font-medium leading-[2.75rem] text-white"
    >
      {t("publish")}
    </AuthGatedLink>
  ) : null;

  if (!level) {
    const { data } = await supabase
      .from("documents")
      .select("level_id, education_levels(label, sort_order)")
      .eq("type", documentType)
      .neq("status", "removed")
      .neq("status", "flagged");

    const levelsMap = new Map<string, { label: string; sort_order: number }>();
    for (const row of data ?? []) {
      const lvl = row.education_levels as unknown as { label: string; sort_order: number } | null;
      if (row.level_id && lvl) levelsMap.set(row.level_id, lvl);
    }
    const levels = [...levelsMap.entries()].sort((a, b) => a[1].sort_order - b[1].sort_order);

    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black">{title}</h1>
          {publishButton}
        </div>
        {levels.length === 0 ? (
          <EmptyState text={t("emptyLevels")} />
        ) : (
          <div className="flex flex-col gap-2">
            {levels.map(([id, lvl]) => (
              <SelectionCard key={id} icon="level" label={lvl.label} href={`${basePath}?level=${id}`} />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!subject) {
    const { data } = await supabase
      .from("documents")
      .select("subject")
      .eq("type", documentType)
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
        <BackLink href={basePath} label={t("back")} />
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-black">{title}</h1>
          {publishButton}
        </div>
        {subjects.length === 0 ? (
          <EmptyState text={t("emptySubjects")} />
        ) : (
          <div className="flex flex-col gap-2">
            {subjects.map(([name, count]) => (
              <SelectionCard
                key={name}
                icon="subject"
                label={name}
                count={count}
                href={`${basePath}?level=${level}&subject=${encodeURIComponent(name)}`}
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
    .eq("type", documentType)
    .eq("level_id", level)
    .eq("subject", subject)
    .neq("status", "removed")
    .neq("status", "flagged");

  const sorted = [...(docs ?? [])].sort(
    (a, b) =>
      (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9) ||
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const user = await getCurrentUser();
  const locale = await getLocale();
  const voteByDoc = new Map<string, 1 | -1>();
  const favoritedDocs = new Set<string>();

  if (user && sorted.length > 0) {
    const docIds = sorted.map((d) => d.id);
    const [{ data: votes }, { data: favs }] = await Promise.all([
      supabase
        .from("votes")
        .select("target_id, value")
        .eq("user_id", user.id)
        .eq("target_type", "document")
        .in("target_id", docIds),
      supabase
        .from("favorites")
        .select("target_id")
        .eq("user_id", user.id)
        .eq("target_type", "document")
        .in("target_id", docIds),
    ]);
    for (const v of votes ?? []) voteByDoc.set(v.target_id, v.value as 1 | -1);
    for (const f of favs ?? []) favoritedDocs.add(f.target_id);
  }

  return (
    <div className="flex flex-col gap-4">
      <BackLink href={`${basePath}?level=${level}`} label={t("back")} />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black">{subject}</h1>
        {publishButton}
      </div>
      {sorted.length === 0 ? (
        <EmptyState text={t("emptyDocuments")} />
      ) : (
        <div className="flex flex-col gap-3">
          <SponsoredSlot placement={PLACEMENT_BY_TYPE[documentType] ?? "courses_list"} locale={locale} subject={subject} />
          {sorted.map((doc) => (
            <DocumentCard
              key={doc.id}
              userId={user?.id ?? null}
              document={{
                ...(doc as unknown as DocumentCardData),
                userVote: voteByDoc.get(doc.id) ?? null,
                isFavorited: favoritedDocs.has(doc.id),
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
