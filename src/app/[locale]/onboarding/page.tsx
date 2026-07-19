import { redirect } from "next/navigation";
import { getCurrentProfile, requireUser } from "@/src/lib/dal";
import { createClient } from "@/src/utils/supabase/server";
import { OnboardingWizard } from "@/src/components/onboarding/onboarding-wizard";

export default async function OnboardingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ref?: string }>;
}) {
  const { locale } = await params;
  const { ref } = await searchParams;
  await requireUser(locale);

  const profile = await getCurrentProfile();
  if (profile) {
    redirect(`/${locale}`);
  }

  const supabase = await createClient();
  const { data: countries } = await supabase
    .from("countries")
    .select("id, code, name")
    .order("name");

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">
      <OnboardingWizard locale={locale} countries={countries ?? []} initialReferralCode={ref ?? ""} />
    </main>
  );
}
