import { getTranslations } from "next-intl/server";
import { createClient } from "@/src/utils/supabase/server";
import { getCurrentProfile } from "@/src/lib/dal";
import { PantheonBoard } from "@/src/components/reputation/pantheon-board";

export default async function ParticipantsPage() {
  const t = await getTranslations("participants");
  const profile = await getCurrentProfile();

  const supabase = await createClient();
  const [{ data: countries }, { data: levels }] = await Promise.all([
    supabase.from("countries").select("id, code, name").order("name"),
    supabase.from("education_levels").select("id, label, country_id").order("sort_order"),
  ]);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-10">
      <div>
        <h1 className="text-2xl font-black">{t("title")}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t("subtitle")}</p>
      </div>
      <PantheonBoard
        countries={countries ?? []}
        levels={levels ?? []}
        viewerId={profile?.id ?? null}
        viewerLevelId={profile?.level_id ?? null}
        viewerCountryId={profile?.country_id ?? null}
      />
    </main>
  );
}
