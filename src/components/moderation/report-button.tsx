"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Flag } from "@phosphor-icons/react";
import { createClient } from "@/src/utils/supabase/client";

const CONTENT_REASONS = ["hors_sujet", "faux", "doublon", "contenu_protege", "inapproprie", "autre"] as const;
const PROFILE_REASONS = ["harcelement", "autre"] as const;

export function ReportButton({
  targetType,
  targetId,
  userId,
  canReport,
}: {
  targetType: "topic" | "answer" | "document" | "user";
  targetId: string;
  userId: string | null;
  canReport: boolean;
}) {
  const t = useTranslations("moderation");
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!canReport || !userId) return null;

  const reasons = targetType === "user" ? PROFILE_REASONS : CONTENT_REASONS;

  async function submit() {
    if (!reason) return;
    setSubmitting(true);
    const { error } = await supabase.from("flags").insert({
      target_type: targetType,
      target_id: targetId,
      reporter_id: userId,
      reason,
      note: note || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error(t("reportError"));
      return;
    }
    setSubmitted(true);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={t("report")}
        className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-neutral-400 hover:text-red-600"
      >
        <Flag size={16} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-sm rounded-t-2xl bg-white p-4 dark:bg-neutral-950 md:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-3 font-black">{targetType === "user" ? t("reportProfileTitle") : t("reportTitle")}</h2>

            {submitted ? (
              <p className="text-sm text-neutral-500">{t("reportThanks")}</p>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  {reasons.map((r) => (
                    <label key={r} className="flex items-center gap-2 text-sm">
                      <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} />
                      {t(`reason.${r}`)}
                    </label>
                  ))}
                </div>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t("notePlaceholder")}
                  rows={2}
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-900"
                />
                <button
                  onClick={submit}
                  disabled={!reason || submitting}
                  className="min-h-11 rounded-xl bg-red-600 px-4 font-medium text-white disabled:opacity-50"
                >
                  {t("submitReport")}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
