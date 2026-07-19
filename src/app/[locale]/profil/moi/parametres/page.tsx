import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentProfile, requireUser } from "@/src/lib/dal";
import { createClient } from "@/src/utils/supabase/server";
import { Link } from "@/src/i18n/navigation";
import { ProfileSettingsForm } from "@/src/components/profile/profile-settings-form";

export default async function ProfileSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireUser(locale);

  const profile = await getCurrentProfile();
  if (!profile) {
    redirect(`/${locale}/onboarding`);
  }

  const t = await getTranslations("settings");
  const supabase = await createClient();
  const { data: countries } = await supabase
    .from("countries")
    .select("id, code, name")
    .order("name");

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 px-4 py-10">
      <ProfileSettingsForm locale={locale} profile={profile} countries={countries ?? []} />

      <div className="flex flex-col gap-2 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="font-black">{t("premiumTitle")}</h2>
        {profile.is_premium ? (
          <p className="text-sm text-green-700 dark:text-green-300">
            {t("premiumActive", {
              date: profile.premium_until ? new Date(profile.premium_until).toLocaleDateString(locale) : "",
            })}
          </p>
        ) : (
          <Link href="/paiement/choisir" className="text-sm text-accent-blue">
            {t("premiumUpgrade")}
          </Link>
        )}
      </div>
    </main>
  );
}
