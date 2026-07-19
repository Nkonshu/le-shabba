import { getTranslations } from "next-intl/server";
import { requireUser } from "@/src/lib/dal";
import { isFeatureEnabled } from "@/src/lib/feature-flags";
import { PREMIUM_OFFLINE_PRICE, PREMIUM_OFFLINE_CURRENCY } from "@/src/lib/payments";
import { PaymentMethodPicker } from "@/src/components/payments/payment-method-picker";

export default async function ChoosePaymentPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireUser(locale);
  const t = await getTranslations("payments");

  const [paypalEnabled, whatsappEnabled, mobileMoneyEnabled] = await Promise.all([
    isFeatureEnabled("payments.paypal"),
    isFeatureEnabled("payments.manual_whatsapp_om"),
    isFeatureEnabled("payments.mobile_money_aggregator"),
  ]);

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-4 px-4 py-10">
      <div>
        <h1 className="text-2xl font-black">{t("choosePaymentTitle")}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t("premiumOfflinePurpose")}</p>
        <p className="mt-1 text-lg font-black">
          {PREMIUM_OFFLINE_PRICE.toLocaleString()} {PREMIUM_OFFLINE_CURRENCY}
        </p>
      </div>

      <PaymentMethodPicker
        userId={user.id}
        paypalEnabled={paypalEnabled}
        whatsappEnabled={whatsappEnabled}
        mobileMoneyEnabled={mobileMoneyEnabled}
      />
    </main>
  );
}
