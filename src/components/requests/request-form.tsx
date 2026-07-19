"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/src/i18n/navigation";
import { createClient } from "@/src/utils/supabase/client";

type Level = { id: string; label: string };

export function RequestForm({
  requesterId,
  countryId,
  levels,
  onCreated,
}: {
  requesterId: string;
  countryId: string | null;
  levels: Level[];
  onCreated?: () => void;
}) {
  const t = useTranslations("requests");
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [levelId, setLevelId] = useState("");
  const [subject, setSubject] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!title.trim() || !subject.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("document_requests").insert({
      requester_id: requesterId,
      title,
      level_id: levelId || null,
      subject,
      country_id: countryId,
    });
    setSubmitting(false);
    if (error) {
      toast.error(t("createError"));
      return;
    }
    toast.success(t("createSuccess"));
    setTitle("");
    setSubject("");
    onCreated?.();
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {t("titleLabel")}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("titlePlaceholder")}
          className="min-h-11 rounded-xl border border-neutral-200 bg-white px-3 dark:border-neutral-800 dark:bg-neutral-900"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {t("subjectLabel")}
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="min-h-11 rounded-xl border border-neutral-200 bg-white px-3 dark:border-neutral-800 dark:bg-neutral-900"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {t("levelLabel")}
        <select
          value={levelId}
          onChange={(e) => setLevelId(e.target.value)}
          className="min-h-11 rounded-xl border border-neutral-200 bg-white px-3 dark:border-neutral-800 dark:bg-neutral-900"
        >
          <option value="">{t("levelAny")}</option>
          {levels.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
      </label>
      <button
        onClick={submit}
        disabled={submitting || !title.trim() || !subject.trim()}
        className="min-h-11 rounded-xl bg-accent-blue px-4 font-medium text-white disabled:opacity-50"
      >
        {t("submitRequest")}
      </button>
    </div>
  );
}
