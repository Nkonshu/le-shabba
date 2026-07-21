import { getTranslations } from "next-intl/server";
import { createClient } from "@/src/utils/supabase/server";
import { Link } from "@/src/i18n/navigation";
import { Pagination, PAGE_SIZE } from "@/src/components/admin/stats/pagination";

type LogRow = {
  id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  note: string | null;
  created_at: string;
  actor: { id: string; full_name: string | null; avatar_url: string | null } | null;
};

export async function AdminLogList({
  action,
  actor,
  from,
  to,
  userIds,
  sp,
  page,
}: {
  action?: string;
  actor?: string;
  from?: string;
  to?: string;
  userIds?: string[];
  sp: Record<string, string | undefined>;
  page: number;
}) {
  const t = await getTranslations("admin");
  const supabase = await createClient();

  let query = supabase
    .from("admin_actions_log")
    .select("id, action, target_type, target_id, note, created_at, actor:profiles!actor_id(id, full_name, avatar_url)", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (action) query = query.eq("action", action);
  if (actor) query = query.eq("actor_id", actor);
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", `${to}T23:59:59`);
  if (userIds) query = query.in("actor_id", userIds);

  const { data: entries, count } = await query;
  const rows = (entries ?? []) as unknown as LogRow[];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  const userTargetIds = rows.filter((r) => r.target_type === "user" && r.target_id).map((r) => r.target_id!);
  const answerTargetIds = rows.filter((r) => r.target_type === "answer" && r.target_id).map((r) => r.target_id!);

  const [{ data: userTargets }, { data: answerTargets }] = await Promise.all([
    userTargetIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", userTargetIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
    answerTargetIds.length
      ? supabase.from("forum_answers").select("id, topic_id").in("id", answerTargetIds)
      : Promise.resolve({ data: [] as { id: string; topic_id: string }[] }),
  ]);

  const userTargetMap = new Map((userTargets ?? []).map((u) => [u.id, u.full_name]));
  const answerTargetMap = new Map((answerTargets ?? []).map((a) => [a.id, a.topic_id]));

  if (rows.length === 0) {
    return (
      <p className="rounded-xl bg-neutral-50 p-6 text-center text-sm text-neutral-500 dark:bg-neutral-900">
        {t("journalEmpty")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map((entry) => {
        let targetLabel = t("targetDeleted");
        let targetHref: string | null = null;

        if (entry.target_type === "user" && entry.target_id) {
          const name = userTargetMap.get(entry.target_id);
          if (name !== undefined) {
            targetLabel = name ?? t("anonymous");
            targetHref = `/profil/${entry.target_id}`;
          }
        } else if (entry.target_type === "answer" && entry.target_id) {
          const topicId = answerTargetMap.get(entry.target_id);
          if (topicId) {
            targetLabel = t("targetAnswer");
            targetHref = `/forum/${topicId}#answer-${entry.target_id}`;
          }
        }

        return (
          <div key={entry.id} className="flex flex-col gap-1 rounded-xl border border-neutral-200 p-3 text-sm dark:border-neutral-800">
            <p>
              <span className="font-medium">{entry.actor?.full_name ?? t("anonymous")}</span>{" "}
              {t(`action.${entry.action}`)}{" "}
              {targetHref ? (
                <Link href={targetHref} className="text-accent-blue">
                  {targetLabel}
                </Link>
              ) : (
                <span className="text-neutral-400">{targetLabel}</span>
              )}
            </p>
            {entry.note && <p className="text-xs text-neutral-500">{entry.note}</p>}
            <p className="text-[10px] text-neutral-400">{new Date(entry.created_at).toLocaleString()}</p>
          </div>
        );
      })}
      <Pagination sp={sp} pageParam="jPage" page={page} totalPages={totalPages} />
    </div>
  );
}
