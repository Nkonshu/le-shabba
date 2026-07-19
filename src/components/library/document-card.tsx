import { BookOpen, FileText, CheckCircle, NotePencil, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { useTranslations } from "next-intl";
import { Link } from "@/src/i18n/navigation";
import { StatusBadge } from "@/src/components/library/status-badge";
import { VoteArrows } from "@/src/components/interactions/vote-arrows";
import { FavoriteStar } from "@/src/components/interactions/favorite-star";

const TYPE_ICONS: Record<string, typeof BookOpen> = {
  Cours: BookOpen,
  Épreuve: FileText,
  Corrigé: CheckCircle,
  "Fiche de révision": NotePencil,
};

export type DocumentCardData = {
  id: string;
  title: string;
  type: string;
  status: string;
  subject: string;
  year: string | null;
  votes_count: number;
  created_at: string;
  level: { label: string } | null;
  country: { code: string } | null;
  related_document_id: string | null;
  related_document: { title: string; type: string } | null;
  userVote?: 1 | -1 | null;
  isFavorited?: boolean;
};

export function DocumentCard({
  document: doc,
  userId,
}: {
  document: DocumentCardData;
  userId: string | null;
}) {
  const t = useTranslations("library");
  const Icon = TYPE_ICONS[doc.type] ?? BookOpen;
  const date = new Date(doc.created_at).toLocaleDateString();

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/document/${doc.id}`} className="flex items-start gap-2">
          <Icon size={20} className="mt-0.5 shrink-0 text-neutral-400" />
          <span className="line-clamp-2 font-medium">{doc.title}</span>
        </Link>
        <div className="flex items-center gap-1">
          <FavoriteStar
            targetType="document"
            targetId={doc.id}
            userId={userId}
            initialFavorited={doc.isFavorited ?? false}
          />
          <StatusBadge status={doc.status} />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {doc.level && (
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] dark:bg-neutral-900">
            {doc.level.label}
          </span>
        )}
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] dark:bg-neutral-900">
          {doc.subject}
        </span>
        {doc.type === "Épreuve" && doc.country && (
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] dark:bg-neutral-900">
            {doc.country.code}
            {doc.year ? ` · ${doc.year}` : ""}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <VoteArrows
            targetType="document"
            targetId={doc.id}
            userId={userId}
            initialCount={doc.votes_count}
            initialVote={doc.userVote ?? null}
          />
          <span className="text-[10px] text-neutral-400">{date}</span>
        </div>
        {doc.related_document_id && doc.related_document && (
          <Link href={`/document/${doc.related_document_id}`} className="flex items-center gap-1 text-[10px] text-accent-blue">
            {doc.related_document.type === "Corrigé" ? t("seeCorrection") : t("seeExam")}
            <ArrowRight size={12} />
          </Link>
        )}
      </div>
    </div>
  );
}
