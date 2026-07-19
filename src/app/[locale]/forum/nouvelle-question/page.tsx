import { requireUser, getCurrentProfile } from "@/src/lib/dal";
import { isCurrentlyBanned } from "@/src/lib/profile";
import { createClient } from "@/src/utils/supabase/server";
import { getTranslations } from "next-intl/server";
import { TopicForm } from "@/src/components/forum/topic-form";

export default async function NewQuestionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireUser(locale);
  const profile = await getCurrentProfile();
  const t = await getTranslations("common");

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

  const { data: tagRows } = await supabase.from("forum_topics").select("tags").not("tags", "is", null);
  const existingTags = [...new Set((tagRows ?? []).flatMap((r) => r.tags ?? []))].sort();

  return (
    <main className="mx-auto flex max-w-sm flex-col justify-center px-4 py-10">
      <TopicForm authorId={profile!.id} levels={levels ?? []} existingTags={existingTags} />
    </main>
  );
}
