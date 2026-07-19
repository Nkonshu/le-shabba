"use client";

import { useTranslations } from "next-intl";
import { CheckCircle, PencilSimple, Trash, ArrowBendUpLeft } from "@phosphor-icons/react";
import { VoteArrows } from "@/src/components/interactions/vote-arrows";
import { FavoriteStar } from "@/src/components/interactions/favorite-star";
import { ReportButton } from "@/src/components/moderation/report-button";
import { ShareButton } from "@/src/components/share/share-button";
import { RankBadge } from "@/src/components/reputation/rank-badge";

export type AnswerData = {
  id: string;
  topic_id: string;
  parent_id: string | null;
  type: "proposal" | "comment";
  content: string;
  attachment_url: string | null;
  is_solution: boolean;
  votes_count: number;
  cited_answer_id: string | null;
  last_moderated_by: string | null;
  created_at: string;
  author: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    genie_points: number;
    badges_bronze: number;
    badges_argent: number;
    badges_or: number;
  } | null;
  userVote?: 1 | -1 | null;
  isFavorited?: boolean;
};

export function AnswerCard({
  answer,
  citedAuthorName,
  userId,
  canManage,
  canMarkSolution,
  isTopicAuthorProposal,
  canReport,
  topicTitle,
  onComment,
  onReply,
  onEdit,
  onDelete,
  onMarkSolution,
}: {
  answer: AnswerData;
  citedAuthorName: string | null;
  userId: string | null;
  canManage: boolean;
  canMarkSolution: boolean;
  isTopicAuthorProposal: boolean;
  canReport: boolean;
  topicTitle: string;
  onComment?: () => void;
  onReply?: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMarkSolution?: () => void;
}) {
  const t = useTranslations("forum");

  return (
    <div
      className={`flex gap-3 rounded-xl border p-4 ${
        answer.is_solution
          ? "border-green-300 bg-green-50/50 dark:border-green-800 dark:bg-green-950/30"
          : "border-neutral-200 dark:border-neutral-800"
      }`}
    >
      <VoteArrows
        targetType="answer"
        targetId={answer.id}
        userId={userId}
        initialCount={answer.votes_count}
        initialVote={answer.userVote ?? null}
      />

      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                answer.type === "proposal"
                  ? "bg-accent-orange/10 text-accent-orange"
                  : "bg-neutral-100 text-neutral-500 dark:bg-neutral-900"
              }`}
            >
              {answer.type === "proposal" ? t("proposalBadge") : t("commentBadge")}
            </span>
            {answer.is_solution && (
              <span className="flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-300">
                <CheckCircle size={14} weight="fill" />
                {t("solutionBadge")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <FavoriteStar
              targetType="answer"
              targetId={answer.id}
              userId={userId}
              initialFavorited={answer.isFavorited ?? false}
            />
            <ReportButton targetType="answer" targetId={answer.id} userId={userId} canReport={canReport} />
            {answer.type === "proposal" && (
              <ShareButton
                contentType="answer"
                contentId={answer.id}
                path={`/forum/${answer.topic_id}#answer-${answer.id}`}
                title={topicTitle}
                topicTitle={topicTitle}
                userId={userId}
              />
            )}
          </div>
        </div>

        {citedAuthorName && (
          <a href={`#answer-${answer.cited_answer_id}`} className="w-fit text-xs text-neutral-400 hover:text-accent-blue">
            @{citedAuthorName}
          </a>
        )}

        <p className="whitespace-pre-wrap text-sm">{answer.content}</p>

        {answer.attachment_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={answer.attachment_url} alt="" className="max-h-40 w-fit rounded-lg object-cover" />
        )}

        <div className="flex justify-end">
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-neutral-100 px-2 py-1.5 text-[10px] text-neutral-400 dark:border-neutral-900">
            <span className="font-medium text-neutral-500">{answer.author?.full_name ?? t("anonymous")}</span>
            {answer.author && (
              <RankBadge
                points={answer.author.genie_points}
                badgesBronze={answer.author.badges_bronze}
                badgesArgent={answer.author.badges_argent}
                badgesOr={answer.author.badges_or}
              />
            )}
            <span>
              {answer.last_moderated_by ? t("moderatedBy") : ""} · {new Date(answer.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {answer.type === "proposal" && onComment && (
            <button onClick={onComment} className="min-h-11 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-50">
              {t("comment")}
            </button>
          )}
          {answer.type === "comment" && onReply && (
            <button onClick={onReply} className="flex min-h-11 items-center gap-1 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-50">
              <ArrowBendUpLeft size={14} />
              {t("reply")}
            </button>
          )}
          {canMarkSolution && !isTopicAuthorProposal && (
            <button onClick={onMarkSolution} className="min-h-11 text-green-700 dark:text-green-300">
              {t("markSolution")}
            </button>
          )}
          {canManage && (
            <>
              <button onClick={onEdit} aria-label="edit" className="flex min-h-11 min-w-11 items-center justify-center text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50">
                <PencilSimple size={14} />
              </button>
              <button onClick={onDelete} aria-label="delete" className="flex min-h-11 min-w-11 items-center justify-center text-neutral-400 hover:text-red-600">
                <Trash size={14} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
