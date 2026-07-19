import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/src/lib/dal";
import { createClient } from "@/src/utils/supabase/server";

export default async function WhatsappPaymentPage({
  params,
}: {
  params: Promise<{ locale: string; paymentId: string }>;
}) {
  const { locale, paymentId } = await params;
  const user = await requireUser(locale);
  const t = await getTranslations("payments");

  const supabase = await createClient();
  const { data: payment } = await supabase
    .from("payments")
    .select("id, amount, currency, status, user_id")
    .eq("id", paymentId)
    .eq("method", "manual_whatsapp_om")
    .maybeSingle();

  if (!payment || payment.user_id !== user.id) {
    notFound();
  }

  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_BUSINESS_NUMBER;
  const message = t("whatsappMessageTemplate", { amount: payment.amount, currency: payment.currency, paymentId: payment.id });
  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`
    : null;

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-4 px-4 py-10">
      <h1 className="text-2xl font-black">{t("whatsappInstructionsTitle")}</h1>

      {payment.status === "confirmed" && <p className="text-sm text-green-700 dark:text-green-300">{t("confirmedStatus")}</p>}
      {payment.status === "rejected" && <p className="text-sm text-red-600 dark:text-red-400">{t("rejectedStatus")}</p>}
      {payment.status === "pending" && (
        <>
          <p className="text-sm text-neutral-500">
            {t("whatsappStep1", { amount: payment.amount, currency: payment.currency })}
          </p>
          {whatsappNumber ? (
            <p className="rounded-xl bg-neutral-50 p-4 text-center text-lg font-black dark:bg-neutral-900">{whatsappNumber}</p>
          ) : (
            <p className="rounded-xl bg-neutral-50 p-4 text-sm text-neutral-500 dark:bg-neutral-900">
              Numéro Orange Money non configuré (NEXT_PUBLIC_WHATSAPP_BUSINESS_NUMBER manquant).
            </p>
          )}
          <p className="text-sm text-neutral-500">{t("whatsappStep2")}</p>
          {whatsappHref && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="min-h-11 rounded-xl bg-accent-blue px-4 text-center font-medium leading-[2.75rem] text-white"
            >
              {t("contactOnWhatsapp")}
            </a>
          )}
          <p className="text-xs text-neutral-400">{t("pendingConfirmation")}</p>
        </>
      )}
    </main>
  );
}
