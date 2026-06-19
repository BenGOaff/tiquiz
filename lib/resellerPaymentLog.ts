// lib/resellerPaymentLog.ts
//
// Journal du flux de paiement revendeur. Best-effort : un echec de log ne
// doit JAMAIS faire echouer un paiement ou un webhook. On capture l'email
// (deja visible par le revendeur dans sa liste clients) et un message
// lisible pour diagnostiquer sans console.

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type PaymentStage = "connect" | "checkout" | "provision" | "webhook";

export async function logPaymentEvent(args: {
  resellerId?: string | null;
  provider?: "stripe" | "paypal" | null;
  stage: PaymentStage;
  event: string;
  /** false = echec (remonte en rouge cote admin / revendeur). */
  ok?: boolean;
  email?: string | null;
  plan?: string | null;
  /** Message lisible : la raison de l'echec, ou un detail utile. */
  detail?: string | null;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from("reseller_payment_events").insert({
      reseller_id: args.resellerId ?? null,
      provider: args.provider ?? null,
      stage: args.stage,
      event: args.event,
      ok: args.ok ?? true,
      email: args.email ?? null,
      plan: args.plan ?? null,
      detail: args.detail ?? null,
      meta: args.meta ?? {},
    });
    if (error) {
      console.error("[resellerPaymentLog] insert failed", args.event, error.message);
    }
  } catch (e) {
    console.error("[resellerPaymentLog] insert threw", (e as Error).message);
  }
}
