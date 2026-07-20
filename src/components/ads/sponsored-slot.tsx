import { getTranslations } from "next-intl/server";
import { createClient } from "@/src/utils/supabase/server";
import { isFeatureEnabled } from "@/src/lib/feature-flags";

type SponsoredSlotData = {
  id: string;
  partner_name: string;
  title: string;
  body: string | null;
  link_url: string;
  image_url: string | null;
};

export type SponsoredSlotPlacement =
  | "home_feed"
  | "courses_list"
  | "exams_list"
  | "revision_sheets_list"
  | "forum_list"
  | "document_detail"
  | "topic_detail";

export async function SponsoredSlot({
  placement,
  locale,
  subject,
}: {
  placement: SponsoredSlotPlacement;
  locale: string;
  subject?: string;
}) {
  const adsEnabled = await isFeatureEnabled("monetization.ads");
  if (!adsEnabled) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .rpc("get_sponsored_slot", { p_placement: placement, p_locale: locale, p_subject: subject ?? null })
    .maybeSingle();
  const slot = data as SponsoredSlotData | null;
  if (!slot) return null;

  const t = await getTranslations("ads");

  return (
    <a
      href={`/api/ads/${slot.id}/click`}
      className="flex gap-3 rounded-xl border border-neutral-200 p-4 hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700"
    >
      {slot.image_url && (
        // eslint-disable-next-line @next/next/no-img-element -- logo partenaire externe, pas une image du site
        <img src={slot.image_url} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
      )}
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-500 dark:bg-neutral-900">
            {t("sponsoredLabel")}
          </span>
          <span className="text-[10px] text-neutral-400">{slot.partner_name}</span>
        </div>
        <span className="font-medium">{slot.title}</span>
        {slot.body && <span className="text-sm text-neutral-500">{slot.body}</span>}
      </div>
    </a>
  );
}
