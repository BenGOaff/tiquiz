// app/order/[slug]/success/page.tsx
//
// Retour de paiement du bon de commande hoste. On RELIT le paiement chez
// le provider (avec la cle du revendeur) pour confirmer, puis on ouvre le
// compte client automatiquement (activateResellerClient, idempotent).
//
// Stripe : ?provider=stripe&session_id=...
// PayPal : ?provider=paypal&subscription_id=...

import { getTranslations } from "next-intl/server";
import { CheckCircle2, Clock } from "lucide-react";

import { getPaypalSubscription } from "@/lib/paypalRest";
import { activateResellerClient } from "@/lib/resellerProvisioning";
import { loadResellerPaymentSecrets } from "@/lib/resellerPayments";
import { logPaymentEvent } from "@/lib/resellerPaymentLog";
import { isResellerAllowedPlan } from "@/lib/reseller";
import { retrieveStripeSession } from "@/lib/stripeRest";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    provider?: string;
    session_id?: string;
    subscription_id?: string;
  }>;
};

async function provision(
  slug: string,
  sp: { provider?: string; session_id?: string; subscription_id?: string },
): Promise<boolean> {
  if (!slug || slug.length < 6) return false;

  const { data: reseller } = await supabaseAdmin
    .from("resellers")
    .select("id,name,status,support_email")
    .eq("slug", slug)
    .maybeSingle();
  if (!reseller || reseller.status !== "active") return false;

  const secrets = await loadResellerPaymentSecrets(reseller.id);
  const provider = (sp.provider ?? "").toLowerCase() as "stripe" | "paypal";

  let plan: string | null = null;
  let email: string | null = null;
  let resellerId: string | null = null;
  let subscriptionId: string | null = null;

  if (provider === "stripe" && sp.session_id && secrets.stripeKey) {
    const info = await retrieveStripeSession(secrets.stripeKey, sp.session_id);
    if (!info || !info.paid) {
      await logPaymentEvent({
        resellerId: reseller.id,
        provider,
        stage: "provision",
        event: "provision_not_paid",
        ok: false,
        detail: "Retour Stripe : paiement non confirme.",
      });
      return false;
    }
    ({ plan, email, resellerId } = info);
    subscriptionId = info.subscriptionId;
  } else if (
    provider === "paypal" &&
    sp.subscription_id &&
    secrets.paypalClientId &&
    secrets.paypalSecret
  ) {
    const info = await getPaypalSubscription({
      clientId: secrets.paypalClientId,
      secret: secrets.paypalSecret,
      env: secrets.paypalEnv,
      subscriptionId: sp.subscription_id,
    });
    if (!info || !info.active) {
      await logPaymentEvent({
        resellerId: reseller.id,
        provider,
        stage: "provision",
        event: "provision_not_active",
        ok: false,
        detail: "Retour PayPal : abonnement non actif.",
      });
      return false;
    }
    ({ plan, email, resellerId } = info);
    subscriptionId = sp.subscription_id ?? null;
  } else {
    await logPaymentEvent({
      resellerId: reseller.id,
      provider: provider || null,
      stage: "provision",
      event: "provision_bad_return",
      ok: false,
      detail: "Retour de paiement incomplet (provider ou identifiant manquant).",
    });
    return false;
  }

  // Anti-falsification : le paiement doit appartenir a CE revendeur.
  if (resellerId !== reseller.id || !email || !plan || !isResellerAllowedPlan(plan)) {
    await logPaymentEvent({
      resellerId: reseller.id,
      provider,
      stage: "provision",
      event: "provision_invalid_data",
      ok: false,
      email,
      plan,
      detail: "Donnees de paiement invalides (revendeur, email ou plan).",
    });
    return false;
  }

  const result = await activateResellerClient({
    reseller: { id: reseller.id, name: reseller.name, support_email: reseller.support_email },
    email,
    plan,
    source: "checkout",
    provider,
    subscriptionId,
  });
  await logPaymentEvent({
    resellerId: reseller.id,
    provider,
    stage: "provision",
    event: result.ok ? "provision_success" : "provision_failed",
    ok: result.ok,
    email,
    plan,
    detail: `Resultat : ${result.outcome}.`,
    meta: { outcome: result.outcome },
  });
  return result.ok;
}

export default async function OrderSuccessPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const ok = await provision(slug, sp);

  const t = await getTranslations("order");

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/tiquiz-logo.png" alt="Tiquiz" className="h-12 w-auto" />
        </div>

        <div className="bg-background border rounded-2xl shadow-sm p-8 space-y-3">
          {ok ? (
            <>
              <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
              <h1 className="text-xl font-bold">{t("successTitle")}</h1>
              <p className="text-sm text-muted-foreground">{t("successBody")}</p>
            </>
          ) : (
            <>
              <Clock className="h-12 w-12 text-amber-500 mx-auto" />
              <h1 className="text-xl font-bold">{t("pendingTitle")}</h1>
              <p className="text-sm text-muted-foreground">{t("pendingBody")}</p>
            </>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground">{t("poweredBy")}</p>
      </div>
    </div>
  );
}
