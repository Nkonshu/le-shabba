"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/src/i18n/navigation";
import { createClient } from "@/src/utils/supabase/client";

export function FlagActions({ flagId, canAct }: { flagId: string; canAct: boolean }) {
  const t = useTranslations("moderation");
  const router = useRouter();
  const supabase = createClient();
  const [pending, setPending] = useState(false);

  if (!canAct) return null;

  async function resolve(action: "confirm" | "dismiss") {
    setPending(true);
    const { error } = await supabase.rpc("resolve_flag", { flag_id_param: flagId, action });
    setPending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => resolve("dismiss")}
        disabled={pending}
        className="min-h-11 rounded-xl border border-neutral-200 px-3 text-xs font-medium disabled:opacity-50 dark:border-neutral-800"
      >
        {t("dismiss")}
      </button>
      <button
        onClick={() => resolve("confirm")}
        disabled={pending}
        className="min-h-11 rounded-xl bg-red-600 px-3 text-xs font-medium text-white disabled:opacity-50"
      >
        {t("confirm")}
      </button>
    </div>
  );
}
