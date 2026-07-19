"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { deleteOwnAccount } from "@/src/app/actions/auth";

export function DeleteAccountButton() {
  const t = useTranslations("settings");
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    setPending(true);
    try {
      await deleteOwnAccount();
    } catch {
      toast.error(t("deleteAccountError"));
      setPending(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="min-h-11 w-fit rounded-xl border border-red-200 px-4 text-sm font-medium text-red-600 dark:border-red-900 dark:text-red-400"
      >
        {t("deleteAccount")}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center"
          onClick={() => !pending && setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-t-2xl bg-white p-4 dark:bg-neutral-950 md:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-2 font-black text-red-600 dark:text-red-400">{t("deleteAccountTitle")}</h2>
            <p className="mb-3 text-sm text-neutral-600 dark:text-neutral-300">{t("deleteAccountExplain")}</p>
            <label className="mb-1 block text-xs text-neutral-500">
              {t("deleteAccountConfirmLabel")}
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={t("deleteAccountConfirmWord")}
              className="mb-3 min-h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-neutral-900"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setOpen(false)}
                disabled={pending}
                className="min-h-11 flex-1 rounded-xl border border-neutral-200 px-4 text-sm font-medium disabled:opacity-50 dark:border-neutral-800"
              >
                {t("deleteAccountCancel")}
              </button>
              <button
                onClick={handleDelete}
                disabled={pending || confirmText.trim().toLowerCase() !== t("deleteAccountConfirmWord").toLowerCase()}
                className="min-h-11 flex-1 rounded-xl bg-red-600 px-4 text-sm font-medium text-white disabled:opacity-50"
              >
                {t("deleteAccountConfirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
