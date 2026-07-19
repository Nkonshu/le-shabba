import { BookOpen, FileText, CheckCircle, NotePencil, ArrowRight, Eye, DownloadSimple } from "@phosphor-icons/react/dist/ssr";
import { useTranslations } from "next-intl";
import { Link } from "@/src/i18n/navigation";
import { StatusBadge } from "@/src/components/library/status-badge";

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
  views_count: number;
  favorites_count: number;
  downloads_count: number;
  created_at: string;
  level: { label: string } | null;
  country: { code: string } | null;
  related_document_id: string | null;
  related_document: { title: string; type: string } | null;
  userVote?: 1 | -1 | null;
  isFavorited?: boolean;
};

// Carte de liste : uniquement des stats non interactives — voter/favoriser ne sont possibles
// qu'une fois le document ouvert (voir document/[id]/page.tsx), même principe que TopicCard.
export function DocumentCard({
  document: doc,
}: {
  document: DocumentCardData;
  userId: string | null;
}) {
  const t = useTranslations("library");
  const ti = useTranslations("interactions");
  const Icon = TYPE_ICONS[doc.type] ?? BookOpen;
  const date = new Date(doc.created_at).toLocaleDateString();

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/document/${doc.id}`} className="flex items-start gap-2">
          <Icon size={20} className="mt-0.5 shrink-0 text-neutral-400" />
          <span className="line-clamp-2 font-medium">{doc.title}</span>
        </Link>
        <StatusBadge status={doc.status} />
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

      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3 text-[10px] text-neutral-400">
          <span>{t("votesCount", { count: doc.votes_count })}</span>
          <span title={ti("viewsCount", { count: doc.views_count })} className="flex items-center gap-1">
            <Eye size={12} />
            {doc.views_count}
          </span>
          <span title={ti("downloadsCount", { count: doc.downloads_count })} className="flex items-center gap-1">
            <DownloadSimple size={12} />
            {doc.downloads_count}
          </span>
          <span>{date}</span>
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
