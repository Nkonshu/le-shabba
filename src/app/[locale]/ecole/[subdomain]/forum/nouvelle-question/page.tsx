import { notFound } from "next/navigation";
import { requireUser, getCurrentProfile } from "@/src/lib/dal";
import { isCurrentlyBanned } from "@/src/lib/profile";
import { createClient } from "@/src/utils/supabase/server";
import { getTranslations } from "next-intl/server";
import { getSchoolBySubdomain, getMembership } from "@/src/lib/schools";
import { TopicForm } from "@/src/components/forum/topic-form";

export default async function SchoolNewQuestionPage({
  params,
}: {
  params: Promise<{ locale: string; subdomain: string }>;
}) {
  const { locale, subdomain } = await params;
  const user = await requireUser(locale);
  const profile = await getCurrentProfile();
  const t = await getTranslations("common");
  const tSchools = await getTranslations("schools");

  const school = await getSchoolBySubdomain(subdomain);
  if (!school) notFound();

  const membership = await getMembership(school.id, user.id);
  if (!membership) {
    return (
      <main className="mx-auto max-w-sm px-4 py-10">
        <p className="text-sm text-neutral-500">{tSchools("notMember")}</p>
      </main>
    );
  }

  if (profile && isCurrentlyBanned(profile)) {
    return (
      <main className="mx-auto max-w-sm px-4 py-10">
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {profile.banned_until
            ? t("bannedTemporary", {
                date: new Date(profile.banned_until).toLocaleDateString(locale),
                reason: profile.ban_reason ?? "",
              })
            : t("bannedPermanent")}
        </p>
      </main>
    );
  }

  const supabase = await createClient();
  const { data: levels } = await supabase
    .from("education_levels")
    .select("id, label, sort_order")
    .eq("country_id", profile?.country_id ?? "")
    .order("sort_order");

  const { data: tagRows } = await supabase
    .from("forum_topics")
    .select("tags")
    .eq("school_id", school.id)
    .not("tags", "is", null);
  const existingTags = [...new Set((tagRows ?? []).flatMap((r) => r.tags ?? []))].sort();

  return (
    <main className="mx-auto flex max-w-sm flex-col justify-center px-4 py-10">
      <TopicForm
        authorId={user.id}
        levels={levels ?? []}
        existingTags={existingTags}
        schoolId={school.id}
        redirectBasePath={`/ecole/${subdomain}/forum`}
      />
    </main>
  );
}
