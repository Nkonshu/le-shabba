import { getTranslations } from "next-intl/server";
import { getCurrentProfile, requireUser } from "@/src/lib/dal";
import { isCurrentlyBanned } from "@/src/lib/profile";
import { createClient } from "@/src/utils/supabase/server";
import { PublishForm } from "@/src/components/publish/publish-form";

export default async function PublishPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { locale } = await params;
  const { type } = await searchParams;
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

  return (
    <main className="mx-auto flex max-w-sm flex-col justify-center px-4 py-10">
      <PublishForm
        authorId={profile!.id}
        countryId={profile!.country_id}
        levels={levels ?? []}
        initialType={type}
      />
    </main>
  );
}
