import { getTranslations } from "next-intl/server";
import { requireUser } from "@/src/lib/dal";

export default async function PaypalReturnPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireUser(locale);
  const t = await getTranslations("payments");

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-4 px-4 py-10 text-center">
      <h1 className="text-2xl font-black">{t("paypalReturnTitle")}</h1>
      <p className="text-sm text-neutral-500">{t("paypalReturnPending")}</p>
    </main>
  );
}
