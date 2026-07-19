import { getTranslations } from "next-intl/server";
import { requireUser } from "@/src/lib/dal";
import { createClient } from "@/src/utils/supabase/server";
import { SchoolRequestForm } from "@/src/components/schools/school-request-form";

export default async function CreateSchoolPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireUser(locale);
  const t = await getTranslations("schools");

  const supabase = await createClient();
  const [{ data: countries }, { data: existingRequest }] = await Promise.all([
    supabase.from("countries").select("id, code, name").order("name"),
    supabase
      .from("school_requests")
      .select("id, school_name, status")
      .eq("requester_id", user.id)
      .eq("status", "pending")
      .maybeSingle(),
  ]);

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-4 px-4 py-10">
      <div>
        <h1 className="text-2xl font-black">{t("createTitle")}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t("createIntro")}</p>
      </div>

      {existingRequest ? (
        <p className="rounded-xl bg-neutral-50 p-4 text-sm text-neutral-500 dark:bg-neutral-900">
          {t("pendingNotice", { name: existingRequest.school_name })}
        </p>
      ) : (
        <SchoolRequestForm requesterId={user.id} countries={countries ?? []} />
      )}
    </main>
  );
}
