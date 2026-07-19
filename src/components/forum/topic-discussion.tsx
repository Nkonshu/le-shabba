"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ChatCircle } from "@phosphor-icons/react";
import { createClient } from "@/src/utils/supabase/client";
import { useRouter } from "@/src/i18n/navigation";
import { toast } from "sonner";
import { AnswerCard, type AnswerData } from "@/src/components/forum/answer-card";
import { ReplyDialog } from "@/src/components/forum/reply-dialog";
import { queueOfflineAnswer } from "@/src/lib/offline";
import { isRateLimited } from "@/src/lib/rate-limit";

type Proposal = AnswerData & { comments: AnswerData[] };

type DialogState = {
  type: "proposal" | "comment";
  parentId: string | null;
  citedId: string | null;
  citedAuthorName: string | null;
  editingId: string | null;
  initialContent: string;
};

export function TopicDiscussion({
  topicId,
  topicTitle,
  topicAuthorId,
  proposals,
  userId,
  isStaff,
  canReport,
  schoolId,
}: {
  topicId: string;
  topicTitle: string;
  topicAuthorId: string;
  proposals: Proposal[];
  userId: string | null;
  isStaff: boolean;
  canReport: boolean;
  schoolId?: string | null;
}) {
  const t = useTranslations("forum");
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const citedExcerptById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of proposals) {
      for (const c of p.comments) {
        map.set(c.id, c.content.slice(0, 60));
      }
    }
    return map;
  }, [proposals]);

  useEffect(() => {
    supabase.rpc("increment_topic_views", { topic_id: topicId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId]);

  function canManage(answer: AnswerData) {
    return Boolean(userId && (answer.author?.id === userId || isStaff));
  }

  async function handleSubmit(content: string, file: File | null) {
    if (!dialog || !userId) return;

    // Annexe A.7 : une réponse rédigée hors-ligne part en file d'attente locale, jamais une
    // tentative réseau vouée à l'échec — le bouton "Envoyer" ne se grise pas pour autant.
    if (!dialog.editingId && !navigator.onLine) {
      await queueOfflineAnswer({
        topicId,
        parentId: dialog.parentId,
        citedAnswerId: dialog.citedId,
        type: dialog.type,
        content,
        attachment: file,
      });
      setDialog(null);
      toast.info(t("queuedOffline"));
      return;
    }

    if (!dialog.editingId && (await isRateLimited(userId, "answer"))) {
      toast.error(t("rateLimited"));
      return;
    }

    let attachmentUrl: string | null = null;
    if (file) {
      const ext = file.name.split(".").pop();
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("forum-attachments").upload(path, file);
      if (!uploadError) {
        attachmentUrl = supabase.storage.from("forum-attachments").getPublicUrl(path).data.publicUrl;
      }
    }

    if (dialog.editingId) {
      await supabase
        .from("forum_answers")
        .update({ content, ...(attachmentUrl ? { attachment_url: attachmentUrl } : {}) })
        .eq("id", dialog.editingId);
    } else {
      await supabase.from("forum_answers").insert({
        topic_id: topicId,
        parent_id: dialog.parentId,
        author_id: userId,
        type: dialog.type,
        content,
        attachment_url: attachmentUrl,
        cited_answer_id: dialog.citedId,
        school_id: schoolId ?? null,
      });
    }

    setDialog(null);
    router.refresh();
  }

  async function handleDelete(answer: AnswerData, hasComments: boolean) {
    const message = hasComments ? t("confirmDeleteWithComments") : t("confirmDelete");
    if (!window.confirm(message)) return;
    await supabase.from("forum_answers").delete().eq("id", answer.id);
    router.refresh();
  }

  async function handleMarkSolution(answerId: string) {
    await supabase.rpc("mark_answer_as_solution", { answer_id: answerId });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4 pb-24">
      {proposals.length === 0 ? (
        <p className="rounded-xl bg-neutral-50 p-6 text-center text-sm text-neutral-500 dark:bg-neutral-900">
          {t("emptyAnswers")}
        </p>
      ) : (
        proposals.map((proposal) => (
          <div key={proposal.id} id={`answer-${proposal.id}`} className="flex flex-col gap-2">
            <AnswerCard
              answer={proposal}
              citedAuthorName={null}
              userId={userId}
              canManage={canManage(proposal)}
              canMarkSolution={Boolean(userId && (userId === topicAuthorId || isStaff) && !proposal.is_solution)}
              isTopicAuthorProposal={false}
              canReport={canReport}
              topicTitle={topicTitle}
              onComment={() =>
                setDialog({
                  type: "comment",
                  parentId: proposal.id,
                  citedId: null,
                  citedAuthorName: null,
                  editingId: null,
                  initialContent: "",
                })
              }
              onEdit={() =>
                setDialog({
                  type: "proposal",
                  parentId: null,
                  citedId: null,
                  citedAuthorName: null,
                  editingId: proposal.id,
                  initialContent: proposal.content,
                })
              }
              onDelete={() => handleDelete(proposal, proposal.comments.length > 0)}
              onMarkSolution={() => handleMarkSolution(proposal.id)}
            />

            {proposal.comments.length > 0 && (
              <div className="ml-6 flex flex-col gap-2 border-l border-neutral-100 pl-4 dark:border-neutral-900">
                {proposal.comments.map((comment) => (
                  <div key={comment.id} id={`answer-${comment.id}`}>
                    <AnswerCard
                      answer={comment}
                      citedAuthorName={
                        comment.cited_answer_id
                          ? (proposal.comments.find((c) => c.id === comment.cited_answer_id)?.author?.full_name ?? null)
                          : null
                      }
                      userId={userId}
                      canManage={canManage(comment)}
                      canMarkSolution={false}
                      isTopicAuthorProposal={false}
                      canReport={canReport}
              topicTitle={topicTitle}
                      onReply={() =>
                        setDialog({
                          type: "comment",
                          parentId: proposal.id,
                          citedId: comment.id,
                          citedAuthorName: comment.author?.full_name ?? t("anonymous"),
                          editingId: null,
                          initialContent: "",
                        })
                      }
                      onEdit={() =>
                        setDialog({
                          type: "comment",
                          parentId: proposal.id,
                          citedId: comment.cited_answer_id,
                          citedAuthorName: null,
                          editingId: comment.id,
                          initialContent: comment.content,
                        })
                      }
                      onDelete={() => handleDelete(comment, false)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}

      {userId && (
        <button
          onClick={() =>
            setDialog({
              type: "proposal",
              parentId: null,
              citedId: null,
              citedAuthorName: null,
              editingId: null,
              initialContent: "",
            })
          }
          className="fixed bottom-6 right-6 flex min-h-14 min-w-14 items-center justify-center gap-2 rounded-full bg-accent-blue px-5 font-medium text-white shadow-lg"
        >
          <ChatCircle size={20} />
          {t("help")}
        </button>
      )}

      {dialog && (
        <ReplyDialog
          type={dialog.type}
          isEditing={Boolean(dialog.editingId)}
          citedAuthorName={dialog.citedAuthorName}
          citedExcerpt={dialog.citedId ? (citedExcerptById.get(dialog.citedId) ?? null) : null}
          initialContent={dialog.initialContent}
          onCancelCitation={
            dialog.citedId ? () => setDialog((d) => (d ? { ...d, citedId: null, citedAuthorName: null } : d)) : undefined
          }
          onClose={() => setDialog(null)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
