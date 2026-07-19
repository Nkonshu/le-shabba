import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/src/utils/supabase/server";
import { requireUser } from "@/src/lib/dal";
import { getSchoolBySubdomain, getMembership } from "@/src/lib/schools";
import { Link } from "@/src/i18n/navigation";
import { SchoolMembersManager, type SchoolMemberRow } from "@/src/components/schools/school-members-manager";

export default async function SchoolAdminPage({
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
  const isMiniAdmin = membership?.role === "school_admin" || membership?.role === "school_moderator";
  if (!isMiniAdmin) {
    redirect(`/${locale}/ecole/${subdomain}`);
  }

  const supabase = await createClient();
  const { data: members } = await supabase
    .from("school_memberships")
    .select("user_id, role, permissions, profile:profiles(full_name, avatar_url)")
    .eq("school_id", school.id)
    .order("created_at", { ascending: true });

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">
          {school.name} — {t("dashboard")}
        </h1>
        <Link href={`/ecole/${subdomain}/admin/moderation`} className="text-sm text-accent-blue">
          {t("moderationTitle")}
        </Link>
      </div>

      <h2 className="font-black">{t("membersTitle")}</h2>
      <SchoolMembersManager
        schoolId={school.id}
        members={(members as unknown as SchoolMemberRow[]) ?? []}
        viewerIsSchoolAdmin={membership?.role === "school_admin"}
        viewerId={user.id}
        seatsUsed={(members ?? []).length}
        maxSeats={school.max_seats}
      />
    </main>
  );
}
