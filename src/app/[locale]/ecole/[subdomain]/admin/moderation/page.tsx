import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/src/utils/supabase/server";
import { requireUser } from "@/src/lib/dal";
import { getSchoolBySubdomain, getMembership, canModerate } from "@/src/lib/schools";
import { Link } from "@/src/i18n/navigation";
import { FlagActions } from "@/src/components/moderation/flag-actions";

type FlagRow = {
  id: string;
  target_type: string;
  target_id: string;
  reason: string;
  note: string | null;
  created_at: string;
  reporter: { full_name: string | null } | null;
};

export default async function SchoolModerationPage({
  params,
}: {
  params: Promise<{ locale: string; subdomain: string }>;
}) {
  const { locale, subdomain } = await params;
  const user = await requireUser(locale);
  const t = await getTranslations("moderation");
  const tSchools = await getTranslations("schools");

  const school = await getSchoolBySubdomain(subdomain);
  if (!school) notFound();

  const membership = await getMembership(school.id, user.id);
  const isMiniAdmin = membership?.role === "school_admin" || membership?.role === "school_moderator";
  if (!isMiniAdmin) {
    redirect(`/${locale}/ecole/${subdomain}`);
  }

  const supabase = await createClient();
  const canViewDocuments = canModerate(membership, "documents");
  const canViewForum = canModerate(membership, "forum");

  const [{ data: schoolDocs }, { data: schoolTopics }] = await Promise.all([
    canViewDocuments
      ? supabase.from("documents").select("id").eq("school_id", school.id)
      : Promise.resolve({ data: [] as { id: string }[] }),
    canViewForum
      ? supabase.from("forum_topics").select("id").eq("school_id", school.id)
      : Promise.resolve({ data: [] as { id: string }[] }),
  ]);

  const topicIds = (schoolTopics ?? []).map((t2) => t2.id);
  const { data: schoolAnswers } = canViewForum && topicIds.length
    ? await supabase.from("forum_answers").select("id").in("topic_id", topicIds)
    : { data: [] as { id: string }[] };

  const targetIds = [
    ...(schoolDocs ?? []).map((d) => d.id),
    ...(schoolTopics ?? []).map((tp) => tp.id),
    ...(schoolAnswers ?? []).map((a) => a.id),
  ];

  const { data: flags } = targetIds.length
    ? await supabase
        .from("flags")
        .select("id, target_type, target_id, reason, note, created_at, reporter:profiles!flags_reporter_id_fkey(full_name)")
        .eq("status", "open")
        .in("target_id", targetIds)
        .order("created_at", { ascending: true })
    : { data: [] as unknown[] };

  const rows = (flags ?? []) as unknown as FlagRow[];

  const docMap = new Map((schoolDocs ?? []).map((d) => [d.id, d.id]));
  const topicMap = new Map((schoolTopics ?? []).map((tp) => [tp.id, tp.id]));
  const [docTitles, topicTitles, answerContents] = await Promise.all([
    docMap.size ? supabase.from("documents").select("id, title").in("id", [...docMap.keys()]) : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    topicMap.size ? supabase.from("forum_topics").select("id, title").in("id", [...topicMap.keys()]) : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    (schoolAnswers ?? []).length
      ? supabase.from("forum_answers").select("id, content, topic_id").in("id", (schoolAnswers ?? []).map((a) => a.id))
      : Promise.resolve({ data: [] as { id: string; content: string; topic_id: string }[] }),
  ]);

  const docTitleMap = new Map((docTitles.data ?? []).map((d) => [d.id, d.title]));
  const topicTitleMap = new Map((topicTitles.data ?? []).map((tp) => [tp.id, tp.title]));
  const answerMap = new Map((answerContents.data ?? []).map((a) => [a.id, a]));

  function targetPreview(flag: FlagRow): { label: string; href: string | null } {
    if (flag.target_type === "document") {
      return { label: docTitleMap.get(flag.target_id) ?? t("targetDeleted"), href: `/ecole/${subdomain}/forum` };
    }
    if (flag.target_type === "topic") {
      return { label: topicTitleMap.get(flag.target_id) ?? t("targetDeleted"), href: `/ecole/${subdomain}/forum/${flag.target_id}` };
    }
    const answer = answerMap.get(flag.target_id);
    return {
      label: answer ? answer.content.slice(0, 80) : t("targetDeleted"),
      href: answer ? `/ecole/${subdomain}/forum/${answer.topic_id}#answer-${flag.target_id}` : null,
    };
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-10">
      <h1 className="text-2xl font-black">{tSchools("moderationTitle")}</h1>

      {rows.length === 0 ? (
        <p className="rounded-xl bg-neutral-50 p-6 text-center text-sm text-neutral-500 dark:bg-neutral-900">
          {tSchools("emptyModeration")}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((flag) => {
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

                <FlagActions flagId={flag.id} canAct={true} />
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
