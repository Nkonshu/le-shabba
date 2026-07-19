"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "@phosphor-icons/react";
import { RichTextEditor } from "@/src/components/forum/rich-text-editor";

export function ReplyDialog({
  type,
  isEditing,
  citedAuthorName,
  citedExcerpt,
  initialContent,
  onCancelCitation,
  onClose,
  onSubmit,
}: {
  type: "proposal" | "comment";
  isEditing: boolean;
  citedAuthorName: string | null;
  citedExcerpt: string | null;
  initialContent: string;
  onCancelCitation?: () => void;
  onClose: () => void;
  onSubmit: (content: string, file: File | null) => Promise<void>;
}) {
  const t = useTranslations("forum");
  const tc = useTranslations("common");
  const [content, setContent] = useState(initialContent);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const title = isEditing
    ? t("editTitle")
    : citedAuthorName
      ? t("replyToTitle", { author: citedAuthorName })
      : type === "proposal"
        ? t("proposalTitle")
        : t("commentTitle");

  // Toolbar de formatage réservée aux propositions — un commentaire reste en texte brut, comme sur
  // Stack Overflow (enjeu trop faible pour justifier du HTML à assainir).
  const contentIsEmpty =
    type === "proposal" ? content.replace(/<[^>]*>/g, "").trim().length === 0 : content.trim().length === 0;

  async function handleSubmit() {
    if (contentIsEmpty && !file) return;
    setSubmitting(true);
    await onSubmit(content, file);
    setSubmitting(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl bg-white p-4 dark:bg-neutral-950 md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-black">{title}</h2>
          <button
            onClick={onClose}
            aria-label={tc("close")}
            title={tc("close")}
            className="flex min-h-11 min-w-11 items-center justify-center text-neutral-400"
          >
            <X size={20} />
          </button>
        </div>

        {citedAuthorName && (
          <div className="mb-3 flex items-start justify-between gap-2 rounded-lg bg-neutral-50 p-2 text-xs dark:bg-neutral-900">
            <span>
              @{citedAuthorName} {citedExcerpt ? `— ${citedExcerpt}` : ""}
            </span>
            {onCancelCitation && (
              <button onClick={onCancelCitation} aria-label={tc("cancel")} title={tc("cancel")}>
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {type === "proposal" ? (
          <RichTextEditor content={content} onChange={setContent} />
        ) : (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900"
          />
        )}

        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mt-2 text-sm"
        />

        <button
          onClick={handleSubmit}
          disabled={submitting || (contentIsEmpty && !file)}
          className="mt-3 min-h-11 w-full rounded-xl bg-accent-blue px-4 font-medium text-white disabled:opacity-50"
        >
          {t("send")}
        </button>
      </div>
    </div>
  );
}
