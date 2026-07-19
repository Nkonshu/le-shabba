"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/src/i18n/navigation";
import { createClient } from "@/src/utils/supabase/client";
import { PREMIUM_OFFLINE_PRICE, PREMIUM_OFFLINE_CURRENCY } from "@/src/lib/payments";
import { PaypalButton } from "@/src/components/payments/paypal-button";

export function PaymentMethodPicker({
  userId,
  paypalEnabled,
  whatsappEnabled,
  mobileMoneyEnabled,
}: {
  userId: string;
  paypalEnabled: boolean;
  whatsappEnabled: boolean;
  mobileMoneyEnabled: boolean;
}) {
  const t = useTranslations("payments");
  const router = useRouter();
  const supabase = createClient();
  const [creating, setCreating] = useState(false);
  const [paypalPaymentId, setPaypalPaymentId] = useState<string | null>(null);

  async function createPayment(method: "paypal" | "manual_whatsapp_om" | "mobile_money_aggregator") {
    setCreating(true);
    const { data, error } = await supabase
      .from("payments")
      .insert({
        user_id: userId,
        purpose: "premium_offline",
        method,
        amount: PREMIUM_OFFLINE_PRICE,
        currency: PREMIUM_OFFLINE_CURRENCY,
      })
      .select("id")
      .single();
    setCreating(false);

    if (error || !data) {
      toast.error(t("createError"));
      return null;
    }
    return data.id as string;
  }

  async function payWithWhatsapp() {
    const paymentId = await createPayment("manual_whatsapp_om");
    if (paymentId) router.push(`/paiement/whatsapp/${paymentId}`);
  }

  async function startPaypal() {
    const paymentId = await createPayment("paypal");
    if (paymentId) setPaypalPaymentId(paymentId);
  }

  return (
    <div className="flex flex-col gap-3">
      {whatsappEnabled && (
        <button
          onClick={payWithWhatsapp}
          disabled={creating}
          className="min-h-11 rounded-xl border border-neutral-200 px-4 font-medium disabled:opacity-50 dark:border-neutral-800"
        >
          {t("payWithWhatsapp")}
        </button>
      )}

      {paypalEnabled && !paypalPaymentId && (
        <button
          onClick={startPaypal}
          disabled={creating}
          className="min-h-11 rounded-xl bg-accent-blue px-4 font-medium text-white disabled:opacity-50"
        >
          {t("payWithPaypal")}
        </button>
      )}
      {paypalPaymentId && (
        <PaypalButton
          paymentId={paypalPaymentId}
          amount={PREMIUM_OFFLINE_PRICE}
          currency={PREMIUM_OFFLINE_CURRENCY}
        />
      )}

      {mobileMoneyEnabled && (
        <button
          onClick={() => createPayment("mobile_money_aggregator")}
          disabled={creating}
          className="min-h-11 rounded-xl border border-neutral-200 px-4 font-medium disabled:opacity-50 dark:border-neutral-800"
        >
          {t("payWithMobileMoney")}
        </button>
      )}
    </div>
  );
}
