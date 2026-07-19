"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Bug, X } from "@phosphor-icons/react";
import { BugReportForm } from "@/src/components/bug-report/bug-report-form";

export function BugReportButton() {
  const t = useTranslations("bugReport");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={t("reportProblem")}
        title={t("reportProblem")}
        className="fixed bottom-6 left-6 z-40 flex min-h-11 min-w-11 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 shadow-lg dark:border-neutral-800 dark:bg-neutral-950"
      >
        <Bug size={18} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-sm rounded-t-2xl bg-white p-4 dark:bg-neutral-950 md:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-black">{t("reportProblem")}</h2>
              <button
                onClick={() => setOpen(false)}
                aria-label={tc("close")}
                title={tc("close")}
                className="flex min-h-11 min-w-11 items-center justify-center text-neutral-400"
              >
                <X size={20} />
              </button>
            </div>
            <BugReportForm />
          </div>
        </div>
      )}
    </>
  );
}
