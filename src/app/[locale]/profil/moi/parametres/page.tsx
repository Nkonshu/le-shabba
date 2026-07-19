import { redirect } from "next/navigation";
import { getCurrentProfile, requireUser } from "@/src/lib/dal";
import { createClient } from "@/src/utils/supabase/server";
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

  const supabase = await createClient();
  const { data: countries } = await supabase
    .from("countries")
    .select("id, code, name")
    .order("name");

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 px-4 py-10">
      <ProfileSettingsForm locale={locale} profile={profile} countries={countries ?? []} />
    </main>
  );
}
