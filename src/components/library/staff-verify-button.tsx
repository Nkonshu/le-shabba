"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/src/i18n/navigation";
import { createClient } from "@/src/utils/supabase/client";

export function StaffVerifyButton({ documentId }: { documentId: string }) {
  const t = useTranslations("library");
  const router = useRouter();
  const supabase = createClient();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    const { error } = await supabase.rpc("mark_document_staff_verified", { doc_id: documentId });
    setPending(false);
    if (error) {
      toast.error(t("verifyError"));
      return;
    }
    toast.success(t("verifySuccess"));
    router.refresh();
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="min-h-11 w-fit rounded-xl border border-green-300 px-3 text-sm font-medium text-green-700 disabled:opacity-50 dark:border-green-800 dark:text-green-300"
    >
      {t("markStaffVerified")}
    </button>
  );
}
