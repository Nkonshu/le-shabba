"use client";

import { useTranslations } from "next-intl";
import { PencilSimple, Trash } from "@phosphor-icons/react";
import { VoteArrows } from "@/src/components/interactions/vote-arrows";
import { ReportButton } from "@/src/components/moderation/report-button";
import { AttachmentLink } from "@/src/components/interactions/attachment-link";
import type { AnswerData } from "@/src/components/forum/answer-card";

// Rendu compact d'un commentaire, distinct de AnswerCard (réservé aux propositions) — inspiré du
// fil de commentaires Stack Overflow : une ligne dense, vote inline, auteur/date à la fin du texte,
// pas de colonne de vote verticale ni de badges de réputation.
export function CommentRow({
  comment,
  citedAuthorName,
  userId,
  canManage,
  canReport,
  onReply,
  onEdit,
  onDelete,
}: {
  comment: AnswerData;
  citedAuthorName: string | null;
  userId: string | null;
  canManage: boolean;
  canReport: boolean;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations("forum");
  const tc = useTranslations("common");

  return (
    <div className="flex items-start gap-1.5 border-t border-neutral-100 py-1.5 text-xs first:border-t-0 dark:border-neutral-900">
      <VoteArrows
        layout="row"
        targetType="answer"
        targetId={comment.id}
        userId={userId}
        initialCount={comment.votes_count}
        initialVote={comment.userVote ?? null}
      />

      <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-1">
        {citedAuthorName && <span className="text-accent-blue">@{citedAuthorName}</span>}
        <span className="whitespace-pre-wrap">{comment.content}</span>
        <span className="text-neutral-400">
          – {comment.author?.full_name ?? t("anonymous")} · {new Date(comment.created_at).toLocaleDateString()}
        </span>
        {comment.attachment_url && <AttachmentLink url={comment.attachment_url} />}
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <button onClick={onReply} className="min-h-8 rounded px-1.5 text-accent-blue hover:underline">
          {t("reply")}
        </button>
        <ReportButton targetType="answer" targetId={comment.id} userId={userId} canReport={canReport} />
        {canManage && (
          <>
            <button onClick={onEdit} aria-label={tc("edit")} title={tc("edit")} className="flex min-h-8 min-w-8 items-center justify-center text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50">
              <PencilSimple size={13} />
            </button>
            <button onClick={onDelete} aria-label={tc("delete")} title={tc("delete")} className="flex min-h-8 min-w-8 items-center justify-center text-neutral-400 hover:text-red-600">
              <Trash size={13} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
