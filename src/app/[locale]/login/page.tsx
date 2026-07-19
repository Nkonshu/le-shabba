import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentProfile, getCurrentUser } from "@/src/lib/dal";
import { GoogleLoginButton } from "@/src/components/auth/google-login-button";

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale } = await params;
  const { next } = await searchParams;

  const user = await getCurrentUser();
  if (user) {
    const profile = await getCurrentProfile();
    redirect(profile ? (next ?? `/${locale}`) : `/${locale}/onboarding`);
  }

  const t = await getTranslations("auth");

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-4 py-10">
      <h1 className="text-2xl font-black">{t("loginTitle")}</h1>
      <GoogleLoginButton returnTo={next} />
    </main>
  );
}
