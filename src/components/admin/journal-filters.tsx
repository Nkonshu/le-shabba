"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/src/i18n/navigation";

const ACTIONS = [
  "ban_user_permanent",
  "ban_user_temporary",
  "unban_user",
  "change_role",
  "edit_content",
  "delete_content",
] as const;

export function JournalFilters({
  actors,
  action,
  actor,
}: {
  actors: { id: string; full_name: string | null }[];
  action?: string;
  actor?: string;
}) {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const router = useRouter();

  function updateParam(key: "action" | "actor", value: string) {
    const params = new URLSearchParams();
    params.set("tab", "journal");
    if (key === "action" ? value : action) params.set("action", key === "action" ? value : action!);
    if (key === "actor" ? value : actor) params.set("actor", key === "actor" ? value : actor!);
    router.push(`/admin?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <select
        value={action ?? ""}
        onChange={(e) => updateParam("action", e.target.value)}
        className="min-h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-neutral-900"
      >
        <option value="">{tCommon("selectPlaceholder")}</option>
        {ACTIONS.map((a) => (
          <option key={a} value={a}>
            {t(`action.${a}`)}
          </option>
        ))}
      </select>
      <select
        value={actor ?? ""}
        onChange={(e) => updateParam("actor", e.target.value)}
        className="min-h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-neutral-900"
      >
        <option value="">{tCommon("selectPlaceholder")}</option>
        {actors.map((a) => (
          <option key={a.id} value={a.id}>
            {a.full_name ?? t("anonymous")}
          </option>
        ))}
      </select>
    </div>
  );
}
