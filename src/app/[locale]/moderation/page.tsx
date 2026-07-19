import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentProfile, requireUser } from "@/src/lib/dal";
import { createClient } from "@/src/utils/supabase/server";
import { Link } from "@/src/i18n/navigation";
import { FlagActions } from "@/src/components/moderation/flag-actions";

const PRIORITY_REASONS = new Set(["contenu_protege", "inapproprie"]);

type FlagRow = {
  id: string;
  target_type: string;
  target_id: string;
  reason: string;
  note: string | null;
  created_at: string;
  reporter: { full_name: string | null } | null;
};

export default async function ModerationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireUser(locale);
  const profile = await getCurrentProfile();
  const t = await getTranslations("moderation");

  const isStaff = Boolean(profile && ["admin", "super_admin"].includes(profile.role));
  const canView = Boolean(profile && (isStaff || profile.genie_points >= 1200));
  const canAct = Boolean(profile && (isStaff || profile.genie_points >= 3500));

  if (!canView) {
    redirect(`/${locale}`);
  }

  const supabase = await createClient();
  const { data: flags } = await supabase
    .from("flags")
    .select("id, target_type, target_id, reason, note, created_at, reporter:profiles!flags_reporter_id_fkey(full_name)")
    .eq("status", "open")
    .order("created_at", { ascending: true });

  const rows = (flags ?? []) as unknown as FlagRow[];

  const byType = {
    document: rows.filter((f) => f.target_type === "document").map((f) => f.target_id),
    topic: rows.filter((f) => f.target_type === "topic").map((f) => f.target_id),
    answer: rows.filter((f) => f.target_type === "answer").map((f) => f.target_id),
    user: rows.filter((f) => f.target_type === "user").map((f) => f.target_id),
  };

  const [docs, topics, answers, users] = await Promise.all([
    byType.document.length
      ? supabase.from("documents").select("id, title").in("id", byType.document)
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    byType.topic.length
      ? supabase.from("forum_topics").select("id, title").in("id", byType.topic)
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    byType.answer.length
      ? supabase.from("forum_answers").select("id, content, topic_id").in("id", byType.answer)
      : Promise.resolve({ data: [] as { id: string; content: string; topic_id: string }[] }),
    byType.user.length
      ? supabase.from("profiles").select("id, full_name").in("id", byType.user)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
  ]);

  const docMap = new Map((docs.data ?? []).map((d) => [d.id, d.title]));
  const topicMap = new Map((topics.data ?? []).map((tp) => [tp.id, tp.title]));
  const answerMap = new Map((answers.data ?? []).map((a) => [a.id, a]));
  const userMap = new Map((users.data ?? []).map((u) => [u.id, u.full_name]));

  const sorted = [...rows].sort((a, b) => {
    if (a.target_type === "user" && b.target_type !== "user") return -1;
    if (b.target_type === "user" && a.target_type !== "user") return 1;
    const aPriority = PRIORITY_REASONS.has(a.reason) ? 0 : 1;
    const bPriority = PRIORITY_REASONS.has(b.reason) ? 0 : 1;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  function targetPreview(flag: FlagRow): { label: string; href: string | null } {
    if (flag.target_type === "document") {
      return { label: docMap.get(flag.target_id) ?? t("targetDeleted"), href: `/document/${flag.target_id}` };
    }
    if (flag.target_type === "topic") {
      return { label: topicMap.get(flag.target_id) ?? t("targetDeleted"), href: `/forum/${flag.target_id}` };
    }
    if (flag.target_type === "answer") {
      const answer = answerMap.get(flag.target_id);
      return {
        label: answer ? answer.content.slice(0, 80) : t("targetDeleted"),
        href: answer ? `/forum/${answer.topic_id}#answer-${flag.target_id}` : null,
      };
    }
    return { label: userMap.get(flag.target_id) ?? t("targetDeleted"), href: `/profil/${flag.target_id}` };
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-10">
      <h1 className="text-2xl font-black">{t("title")}</h1>

      {sorted.length === 0 ? (
        <p className="rounded-xl bg-neutral-50 p-6 text-center text-sm text-neutral-500 dark:bg-neutral-900">
          {t("empty")}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((flag) => {
            const preview = targetPreview(flag);
            return (
              <div key={flag.id} className="flex flex-col gap-2 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] dark:bg-neutral-900">
                    {t(`targetType.${flag.target_type}`)}
                  </span>
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] text-red-700 dark:bg-red-950 dark:text-red-300">
                    {t(`reason.${flag.reason}`)}
                  </span>
                </div>

                {preview.href ? (
                  <Link href={preview.href} className="text-sm text-accent-blue">
                    {preview.label}
                  </Link>
                ) : (
                  <p className="text-sm text-neutral-400">{preview.label}</p>
                )}

                {flag.note && <p className="text-xs text-neutral-500">{flag.note}</p>}

                <p className="text-[10px] text-neutral-400">
                  {t("reportedBy", { name: flag.reporter?.full_name ?? t("anonymous") })} ·{" "}
                  {new Date(flag.created_at).toLocaleDateString()}
                </p>

                <FlagActions flagId={flag.id} canAct={canAct} />
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
