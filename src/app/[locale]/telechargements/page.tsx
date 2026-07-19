import { getTranslations } from "next-intl/server";
import { OfflineDownloadsList } from "@/src/components/pwa/offline-downloads-list";

export default async function DownloadsPage() {
  const t = await getTranslations("pwa");

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-4 px-4 py-10">
      <h1 className="text-2xl font-black">{t("downloadsTitle")}</h1>
      <OfflineDownloadsList />
    </main>
  );
}
