import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/src/lib/dal";
import { Link } from "@/src/i18n/navigation";
import { getSchoolBySubdomain, getMembership } from "@/src/lib/schools";

export default async function SchoolHomePage({
  params,
}: {
  params: Promise<{ locale: string; subdomain: string }>;
}) {
  const { locale, subdomain } = await params;
  const user = await requireUser(locale);
  const t = await getTranslations("schools");

  const school = await getSchoolBySubdomain(subdomain);
  if (!school) notFound();

  const membership = await getMembership(school.id, user.id);
  if (!membership) {
    return (
      <main className="mx-auto flex max-w-sm flex-col gap-4 px-4 py-10 text-center">
        <p className="text-sm text-neutral-500">{t("notMember")}</p>
      </main>
    );
  }

  const isMiniAdmin = membership.role === "school_admin" || membership.role === "school_moderator";

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-4 px-4 py-10">
      <h1 className="text-2xl font-black">{school.name}</h1>

      <div className="flex flex-col gap-2">
        <Link
          href={`/ecole/${subdomain}/forum`}
          className="min-h-11 rounded-xl border border-neutral-200 px-4 font-medium leading-[2.75rem] dark:border-neutral-800"
        >
          {t("navLabel")} — Forum
        </Link>
        {isMiniAdmin && (
          <Link
            href={`/ecole/${subdomain}/admin`}
            className="min-h-11 rounded-xl border border-neutral-200 px-4 font-medium leading-[2.75rem] dark:border-neutral-800"
          >
            {t("dashboard")}
          </Link>
        )}
      </div>

      <Link href="/" className="text-sm text-accent-blue">
        {t("viewPublicLibrary")}
      </Link>
    </main>
  );
}
