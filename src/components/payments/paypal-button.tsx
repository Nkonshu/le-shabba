"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

// PayPal ne supporte pas le XOF (Franc CFA) comme devise de checkout — conversion nécessaire
// ("montant converti en devise PayPal si besoin", Annexe A.12). Taux fixe provisoire en l'absence
// d'un vrai service de taux de change en temps réel ; le paiement reste enregistré en XOF (§4.10),
// seul le montant affiché/facturé par PayPal est converti.
const XOF_TO_USD_RATE = 0.0016;

declare global {
  interface Window {
    paypal?: {
      Buttons: (options: Record<string, unknown>) => { render: (selector: string) => void };
    };
  }
}

export function PaypalButton({
  paymentId,
  amount,
  currency,
}: {
  paymentId: string;
  amount: number;
  currency: string;
}) {
  const t = useTranslations("payments");
  const containerRef = useRef<HTMLDivElement>(null);
  const [sdkError, setSdkError] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

  useEffect(() => {
    if (!clientId || !containerRef.current) return;

    const usdAmount = (amount * XOF_TO_USD_RATE).toFixed(2);
    const scriptId = "paypal-sdk";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    function render() {
      if (!window.paypal || !containerRef.current) return;
      containerRef.current.innerHTML = "";
      window.paypal
        .Buttons({
          createOrder: (_data: unknown, actions: { order: { create: (o: object) => Promise<string> } }) =>
            actions.order.create({
              purchase_units: [{ amount: { value: usdAmount, currency_code: "USD" }, custom_id: paymentId }],
            }),
          // La capture se fait bien ici (SDK PayPal, argent réellement débité), mais la CONFIRMATION
          // du paiement chez nous ne vient jamais de ce callback client — seul le webhook PayPal
          // serveur-à-serveur (signature vérifiée, /api/payments/paypal/webhook) appelle
          // confirm_paypal_payment. Un callback client qui confirmerait directement le paiement
          // serait une faille : n'importe qui pourrait POSTer un faux id de transaction pour
          // débloquer le premium gratuitement.
          onApprove: async (_data: unknown, actions: { order: { capture: () => Promise<{ id: string }> } }) => {
            await actions.order.capture();
            window.location.href = "/paiement/paypal/retour";
          },
        })
        .render(`#paypal-button-${paymentId}`);
    }

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`;
      script.onload = render;
      script.onerror = () => setSdkError(true);
      document.body.appendChild(script);
    } else {
      render();
    }
  }, [clientId, amount, paymentId]);

  if (!clientId) {
    return (
      <p className="rounded-xl bg-neutral-50 p-3 text-xs text-neutral-500 dark:bg-neutral-900">
        PayPal non configuré (NEXT_PUBLIC_PAYPAL_CLIENT_ID manquant).
      </p>
    );
  }
  if (sdkError) {
    return <p className="text-xs text-red-600 dark:text-red-400">{t("createError")}</p>;
  }

  return (
    <div className="flex flex-col gap-1">
      <p className="text-[10px] text-neutral-400">
        ≈ {(amount * XOF_TO_USD_RATE).toFixed(2)} USD ({amount.toLocaleString()} {currency})
      </p>
      <div id={`paypal-button-${paymentId}`} ref={containerRef} />
    </div>
  );
}
