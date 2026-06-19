// app/order/[slug]/[plan]/page.tsx
//
// Bon de commande HOSTE d'un revendeur, version checkout NATIF (Bene 19
// juin 2026). Page publique : rappelle le plan + le tarif du revendeur,
// puis tunnel de paiement integre (composant ResellerCheckout) qui cree
// l'abonnement sur le compte Stripe/PayPal du revendeur. Le compte client
// s'ouvre automatiquement au retour (page success).
//
// URL : /order/<slug>/<plan> avec slug = resellers.slug (12 hex non
// devinables) et plan = monthly | yearly | monthly_plus | yearly_plus.
//
// 404 si : slug inconnu, revendeur suspendu, plan invalide, tarif non
// fixe, ou aucun moyen de paiement connecte.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Check } from "lucide-react";

import ResellerCheckout from "@/components/order/ResellerCheckout";
import { isAdminEmail } from "@/lib/adminEmails";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string; plan: string }> };

// Mapping plan -> cles i18n du namespace settings (memes cartes que
// Reglages -> Abonnement, source de verite unique du contenu des plans).
const PLAN_CONTENT: Record<
  string,
  { nameKey: string; periodKey: string; featureKeys: string[] }
> = {
  monthly: {
    nameKey: "planProName",
    periodKey: "planProPeriod",
    featureKeys: ["planProF1", "planProF2", "planProF3", "planProF4", "planProF5", "planProF6"],
  },
  yearly: {
    nameKey: "planYearlyName",
    periodKey: "planYearlyPeriod",
    featureKeys: ["planYearlyF1", "planYearlyF2", "planYearlyF3", "planYearlyF4"],
  },
  monthly_plus: {
    nameKey: "planMonthlyPlusName",
    periodKey: "planMonthlyPlusPeriod",
    featureKeys: [
      "planMonthlyPlusF1",
      "planMonthlyPlusF2",
      "planMonthlyPlusF3",
      "planMonthlyPlusF4",
    ],
  },
  yearly_plus: {
    nameKey: "planYearlyPlusName",
    periodKey: "planYearlyPlusPeriod",
    featureKeys: [
      "planYearlyPlusF1",
      "planYearlyPlusF2",
      "planYearlyPlusF3",
      "planYearlyPlusF4",
    ],
  },
};

const PLAN_PERIOD_SUFFIX: Record<string, "month" | "year"> = {
  monthly: "month",
  monthly_plus: "month",
  yearly: "year",
  yearly_plus: "year",
};

interface OrderReseller {
  name: string;
  status: string;
  pricing: Record<string, { label?: string; amount_cents?: number }>;
  stripe_secret_key_enc: string | null;
  paypal_client_id_enc: string | null;
  paypal_secret_enc: string | null;
}

async function loadOrder(slug: string, plan: string) {
  if (!PLAN_CONTENT[plan]) return null;

  // Mode APERCU pour Bene (admin uniquement) : /order/preview/<plan>.
  if (slug === "preview") {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !isAdminEmail(user.email)) return null;
    return {
      name: "Apercu revendeur",
      priceLabel: "19 EUR / mois",
      stripeAvailable: true,
      paypalAvailable: true,
    };
  }

  if (!slug || slug.length < 6) return null;

  const { data, error } = await supabaseAdmin
    .from("resellers")
    .select(
      "name,status,pricing,stripe_secret_key_enc,paypal_client_id_enc,paypal_secret_enc",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return null;

  const reseller = data as unknown as OrderReseller;
  if (reseller.status !== "active") return null;

  const amountCents = (reseller.pricing ?? {})[plan]?.amount_cents;
  // Sans tarif fixe, on ne peut rien facturer : pas de page.
  if (!amountCents || amountCents <= 0) return null;

  const stripeAvailable = Boolean(reseller.stripe_secret_key_enc);
  const paypalAvailable = Boolean(
    reseller.paypal_client_id_enc && reseller.paypal_secret_enc,
  );
  // Aucun moyen de paiement connecte : pas de page.
  if (!stripeAvailable && !paypalAvailable) return null;

  return {
    name: reseller.name,
    amountCents,
    stripeAvailable,
    paypalAvailable,
    priceLabel: (reseller.pricing ?? {})[plan]?.label ?? null,
  };
}

function formatPrice(amountCents: number, plan: string, perMonth: string, perYear: string) {
  const amount = (amountCents / 100).toFixed(2).replace(/\.00$/, "").replace(".", ",");
  const suffix = PLAN_PERIOD_SUFFIX[plan] === "year" ? perYear : perMonth;
  return `${amount} EUR ${suffix}`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, plan } = await params;
  const order = await loadOrder(slug, plan);
  if (!order) return { title: "Tiquiz" };
  const t = await getTranslations("settings");
  return { title: `${t(PLAN_CONTENT[plan].nameKey)} - ${order.name}` };
}

export default async function ResellerOrderPage({ params }: PageProps) {
  const { slug, plan } = await params;
  const order = await loadOrder(slug, plan);
  if (!order) notFound();

  const tSettings = await getTranslations("settings");
  const tOrder = await getTranslations("order");
  const content = PLAN_CONTENT[plan];

  const priceLabel =
    order.priceLabel ??
    ("amountCents" in order && order.amountCents
      ? formatPrice(order.amountCents, plan, tOrder("perMonth"), tOrder("perYear"))
      : null);

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/tiquiz-logo.png" alt="Tiquiz" className="h-12 w-auto" />
        </div>

        <div className="bg-background border rounded-2xl shadow-sm p-6 space-y-5">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold">{tSettings(content.nameKey)}</h1>
            <p className="text-sm text-muted-foreground">
              {tOrder("soldBy", { name: order.name })}
            </p>
          </div>

          {priceLabel ? (
            <div className="text-center">
              <span className="text-3xl font-bold">{priceLabel}</span>
            </div>
          ) : null}

          <ul className="space-y-2">
            {content.featureKeys.map((fk) => (
              <li key={fk} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-primary shrink-0" />
                {tSettings(fk)}
              </li>
            ))}
          </ul>

          <ResellerCheckout
            slug={slug}
            plan={plan}
            stripeAvailable={order.stripeAvailable}
            paypalAvailable={order.paypalAvailable}
          />
        </div>

        <p className="text-[11px] text-muted-foreground text-center">
          {tOrder("poweredBy")}
        </p>
      </div>
    </div>
  );
}
