import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/src/utils/supabase/server";
import { getCurrentProfile, getCurrentUser } from "@/src/lib/dal";
import { Link } from "@/src/i18n/navigation";
import { StatusBadge } from "@/src/components/library/status-badge";
import { DocumentReaderLauncher } from "@/src/components/reader/document-reader-launcher";
import { VoteArrows } from "@/src/components/interactions/vote-arrows";
import { FavoriteStar } from "@/src/components/interactions/favorite-star";
import { StaffVerifyButton } from "@/src/components/library/staff-verify-button";
import { ReportButton } from "@/src/components/moderation/report-button";
import { ShareButton } from "@/src/components/share/share-button";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: doc } = await supabase.from("documents").select("title, subject").eq("id", id).maybeSingle();
  if (!doc) return {};

  const description = `${doc.subject} — Le Shabba`;
  return {
    title: doc.title,
    description,
    openGraph: {
      title: doc.title,
      description,
      images: ["/og-image.png"],
      url: `/document/${id}`,
    },
  };
}

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("library");
  const user = await getCurrentUser();
  const profile = await getCurrentProfile();
  const isStaff = Boolean(profile && ["admin", "super_admin"].includes(profile.role));
  const canReport = Boolean(profile && (isStaff || profile.genie_points >= 1200));

  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("documents")
    .select(
      "id, title, type, status, subject, year, votes_count, created_at, author_id, file_url, related_document_id, level:education_levels(label), country:countries(code), related_document:documents!related_document_id(title, type)"
    )
    .eq("id", id)
    .maybeSingle();

  if (!doc || doc.status === "removed") {
    notFound();
  }

  const isAuthor = user?.id === doc.author_id;
  if (doc.status === "flagged" && !isAuthor) {
    notFound();
  }

  let initialPage = 1;
  let userVote: 1 | -1 | null = null;
  let isFavorited = false;
  if (user) {
    const [{ data: progress }, { data: vote }, { data: favorite }] = await Promise.all([
      supabase
        .from("document_reading_progress")
        .select("last_page")
        .eq("document_id", id)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("votes")
        .select("value")
        .eq("target_type", "document")
        .eq("target_id", id)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("favorites")
        .select("id")
        .eq("target_type", "document")
        .eq("target_id", id)
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);
    if (progress) initialPage = progress.last_page;
    if (vote) userVote = vote.value as 1 | -1;
    isFavorited = Boolean(favorite);
  }

  const level = doc.level as unknown as { label: string } | null;
  const country = doc.country as unknown as { code: string } | null;
  const related = doc.related_document as unknown as { title: string; type: string } | null;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-10">
      {doc.status === "flagged" && isAuthor && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {t("underReview")}
        </p>
      )}

      <div className="flex items-start justify-between gap-2">
        <h1 className="text-xl font-black">{doc.title}</h1>
        <div className="flex items-center gap-1">
          <FavoriteStar
            targetType="document"
            targetId={doc.id}
            userId={user?.id ?? null}
            initialFavorited={isFavorited}
          />
          <ReportButton targetType="document" targetId={doc.id} userId={user?.id ?? null} canReport={canReport} />
          <ShareButton
            contentType="document"
            contentId={doc.id}
            path={`/document/${doc.id}`}
            title={doc.title}
            subject={doc.subject}
            level={level?.label}
            userId={user?.id ?? null}
          />
          <StatusBadge status={doc.status} />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {level && (
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] dark:bg-neutral-900">
            {level.label}
          </span>
        )}
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] dark:bg-neutral-900">
          {doc.subject}
        </span>
        {doc.type === "Épreuve" && country && (
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] dark:bg-neutral-900">
            {country.code}
            {doc.year ? ` · ${doc.year}` : ""}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <VoteArrows
          targetType="document"
          targetId={doc.id}
          userId={user?.id ?? null}
          initialCount={doc.votes_count}
          initialVote={userVote}
        />
        <span className="text-[10px] text-neutral-400">{new Date(doc.created_at).toLocaleDateString()}</span>
      </div>

      {doc.related_document_id && related && (
        <Link href={`/document/${doc.related_document_id}`} className="w-fit text-sm text-accent-blue">
          {related.type === "Corrigé" ? t("seeCorrection") : t("seeExam")}
        </Link>
      )}

      {isStaff && doc.status !== "staff_verified" && <StaffVerifyButton documentId={doc.id} />}

      <DocumentReaderLauncher
        documentId={doc.id}
        title={doc.title}
        subject={doc.subject}
        fileUrl={doc.file_url}
        initialPage={initialPage}
      />
    </main>
  );
}
