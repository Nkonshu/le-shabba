import { getTranslations } from "next-intl/server";
import { createClient } from "@/src/utils/supabase/server";
import { getCurrentProfile, getCurrentUser } from "@/src/lib/dal";
import { RequestList, type RequestRow } from "@/src/components/requests/request-list";

export default async function RequestsPage() {
  const t = await getTranslations("requests");
  const supabase = await createClient();
  const user = await getCurrentUser();
  const profile = await getCurrentProfile();

  const [{ data: requests }, { data: levels }] = await Promise.all([
    supabase
      .from("document_requests")
      .select("id, title, subject, status, created_at, fulfilled_by_document_id, level:education_levels(label), country:countries(code)")
      .order("created_at", { ascending: false }),
    profile?.country_id
      ? supabase.from("education_levels").select("id, label").eq("country_id", profile.country_id).order("sort_order")
      : Promise.resolve({ data: [] as { id: string; label: string }[] }),
  ]);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-10">
      <h1 className="text-2xl font-black">{t("title")}</h1>
      <RequestList
        requests={(requests as unknown as RequestRow[]) ?? []}
        userId={user?.id ?? null}
        countryId={profile?.country_id ?? null}
        levels={levels ?? []}
      />
    </main>
  );
}
