import { NextResponse } from "next/server";
import { createServiceClient } from "@/src/utils/supabase/service";

// §4.10/A.12 : webhook Kkiapay/CinetPay — construit et testable en sandbox dès maintenant, dormant
// tant que `payments.mobile_money_aggregator` reste désactivé (aucun bouton ne l'expose aux élèves).
// Kkiapay et CinetPay ont chacun leur propre schéma de signature ; lequel des deux sera retenu n'est
// pas encore tranché (les deux clés existent en référence, §7). En attendant ce choix, la vérification
// ci-dessous exige un secret partagé simple plutôt que de faire semblant de vérifier une signature
// dont le format réel dépend du prestataire finalement choisi — à remplacer par la vérification
// officielle du prestataire retenu au moment de l'activation.
function isAuthorized(request: Request): boolean {
  const sharedSecret = process.env.KKIAPAY_PRIVATE_KEY || process.env.CINETPAY_API_KEY;
  if (!sharedSecret) return false;
  return request.headers.get("x-webhook-secret") === sharedSecret;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { paymentId, transactionId, status } = body as {
    paymentId?: string;
    transactionId?: string;
    status?: string;
  };

  if (!paymentId || !transactionId) {
    return NextResponse.json({ error: "missing payment reference" }, { status: 400 });
  }

  const supabase = createServiceClient();

  if (status === "refunded") {
    await supabase.from("payments").update({ status: "refunded" }).eq("id", paymentId).eq("method", "mobile_money_aggregator");
  } else {
    await supabase.rpc("confirm_mobile_money_payment", { payment_id: paymentId, aggregator_transaction_id: transactionId });
  }

  return NextResponse.json({ ok: true });
}
