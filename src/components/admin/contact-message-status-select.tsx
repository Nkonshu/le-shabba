"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/src/i18n/navigation";
import { createClient } from "@/src/utils/supabase/client";

const STATUSES = ["new", "read", "replied", "archived"] as const;

export function ContactMessageStatusSelect({ id, status }: { id: string; status: string }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const supabase = createClient();
  const [pending, setPending] = useState(false);

  async function handleChange(newStatus: string) {
    setPending(true);
    const { error } = await supabase.from("contact_messages").update({ status: newStatus }).eq("id", id);
    setPending(false);
    if (error) {
      toast.error(t("actionError"));
      return;
    }
    router.refresh();
  }

  return (
    <select
      value={status}
      disabled={pending}
      onChange={(e) => handleChange(e.target.value)}
      className="min-h-11 rounded-xl border border-neutral-200 bg-white px-2 text-xs dark:border-neutral-800 dark:bg-neutral-900"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {t(`contactMessageStatus.${s}`)}
        </option>
      ))}
    </select>
  );
}
