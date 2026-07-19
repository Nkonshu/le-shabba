import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentProfile, getCurrentUser } from "@/src/lib/dal";
import { GoogleLoginButton } from "@/src/components/auth/google-login-button";

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string; deleted?: string }>;
}) {
  const { locale } = await params;
  const { next, deleted } = await searchParams;

  const user = await getCurrentUser();
  if (user) {
    const profile = await getCurrentProfile();
    redirect(profile ? (next ?? `/${locale}`) : `/${locale}/onboarding`);
  }

  const t = await getTranslations("auth");

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-4 py-10">
      <h1 className="text-2xl font-black">{t("loginTitle")}</h1>
      {deleted && (
        <p className="rounded-xl bg-neutral-50 p-3 text-sm text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300">
          {t("accountDeletedNotice")}
        </p>
      )}
      <GoogleLoginButton returnTo={next} />
    </main>
  );
}
