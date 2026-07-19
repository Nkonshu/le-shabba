import { NextResponse } from "next/server";
import { createServiceClient } from "@/src/utils/supabase/service";

// §4.10/A.12 : traite le webhook PayPal — signature vérifiée côté serveur avant de faire confiance
// à quoi que ce soit. Jamais appelée directement par le client (voir le commentaire dans
// paypal-button.tsx) : seul un vrai POST serveur-à-serveur de PayPal, avec ces en-têtes de
// signature, doit pouvoir confirmer un paiement.
const PAYPAL_API_BASE = "https://api-m.paypal.com";

async function verifyWebhookSignature(headers: Headers, body: string): Promise<boolean> {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!clientId || !clientSecret || !webhookId) {
    // Pas de clés configurées : on refuse plutôt que de faire semblant de vérifier — un webhook
    // "accepté" sans vérification serait une faille de sécurité, pas une fonctionnalité en attente.
    return false;
  }

  const tokenRes = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!tokenRes.ok) return false;
  const { access_token } = await tokenRes.json();

  const verifyRes = await fetch(`${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_algo: headers.get("paypal-auth-algo"),
      cert_url: headers.get("paypal-cert-url"),
      transmission_id: headers.get("paypal-transmission-id"),
      transmission_sig: headers.get("paypal-transmission-sig"),
      transmission_time: headers.get("paypal-transmission-time"),
      webhook_id: webhookId,
      webhook_event: JSON.parse(body),
    }),
  });
  if (!verifyRes.ok) return false;
  const { verification_status } = await verifyRes.json();
  return verification_status === "SUCCESS";
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  const isValid = await verifyWebhookSignature(request.headers, rawBody);
  if (!isValid) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);
  const eventType = event.event_type as string | undefined;
  const paymentId = event.resource?.purchase_units?.[0]?.custom_id as string | undefined;
  const transactionId = event.resource?.id as string | undefined;

  if (!paymentId || !transactionId) {
    return NextResponse.json({ error: "missing payment reference" }, { status: 400 });
  }

  const supabase = createServiceClient();

  if (eventType === "PAYMENT.CAPTURE.COMPLETED" || eventType === "CHECKOUT.ORDER.APPROVED") {
    await supabase.rpc("confirm_paypal_payment", { payment_id: paymentId, paypal_transaction_id: transactionId });
  } else if (eventType === "PAYMENT.CAPTURE.REFUNDED") {
    await supabase.from("payments").update({ status: "refunded" }).eq("id", paymentId).eq("method", "paypal");
  }

  return NextResponse.json({ ok: true });
}
