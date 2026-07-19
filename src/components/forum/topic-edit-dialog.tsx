"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "@phosphor-icons/react";

export function TopicEditDialog({
  initialTitle,
  initialContent,
  onClose,
  onSubmit,
}: {
  initialTitle: string;
  initialContent: string;
  onClose: () => void;
  onSubmit: (title: string, content: string) => Promise<void>;
}) {
  const t = useTranslations("forum");
  const tc = useTranslations("common");
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    await onSubmit(title, content);
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-t-2xl bg-white p-4 dark:bg-neutral-950 md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-black">{t("editTitle")}</h2>
          <button
            onClick={onClose}
            aria-label={tc("close")}
            title={tc("close")}
            className="flex min-h-11 min-w-11 items-center justify-center text-neutral-400"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("titleLabel")}
            className="min-h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-neutral-900"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            placeholder={t("descriptionLabel")}
            className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-900"
          />
          <button
            onClick={handleSubmit}
            disabled={submitting || !title.trim() || !content.trim()}
            className="min-h-11 rounded-xl bg-accent-blue px-4 font-medium text-white disabled:opacity-50"
          >
            {tc("save")}
          </button>
        </div>
      </div>
    </div>
  );
}
