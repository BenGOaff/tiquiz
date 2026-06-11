// app/order/[slug]/[plan]/page.tsx
//
// Bon de commande HÉBERGÉ d'un revendeur (phase 3, Béné 11 juin 2026).
// Page publique : rappelle le contenu du plan commandé + le tarif du
// revendeur, et envoie vers SA page de paiement (Stripe/PayPal,
// resellers.checkout_urls). Tiquiz n'encaisse rien ici.
//
// URL : /order/<slug>/<plan> avec slug = resellers.slug (12 hex non
// devinables) et plan = monthly | yearly | monthly_plus | yearly_plus.
//
// 404 si : slug inconnu, revendeur suspendu, plan invalide ou sans URL
// de paiement configurée. JAMAIS de fallback vers les BDC tipote.fr
// (règle critique : le client du revendeur paye le revendeur).

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Check } from "lucide-react";

import { isAdminEmail } from "@/lib/adminEmails";
import { normalizePlanPayment } from "@/lib/reseller";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string; plan: string }> };

// Mapping plan -> clés i18n du namespace settings (mêmes cartes que
// Réglages -> Abonnement, source de vérité unique du contenu des plans).
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

interface OrderReseller {
  name: string;
  status: string;
  checkout_urls: Record<
    string,
    { stripe?: string; paypal?: string; sio?: string } | string
  >;
  pricing: Record<string, { label?: string }>;
}

async function loadOrder(slug: string, plan: string) {
  if (!PLAN_CONTENT[plan]) return null;

  // Mode APERÇU pour Béné (admin uniquement) : /order/preview/<plan>
  // affiche le bon de commande avec des données d'exemple, sans créer
  // de revendeur. Permet d'ajuster textes et design.
  if (slug === "preview") {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !isAdminEmail(user.email)) return null;
    return {
      name: "Aperçu revendeur",
      stripeUrl: "#",
      paypalUrl: "#",
      priceLabel: "19 € / mois",
    };
  }

  if (!slug || slug.length < 6) return null;

  const { data, error } = await supabaseAdmin
    .from("resellers")
    .select("name,status,checkout_urls,pricing")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return null;

  const reseller = data as unknown as OrderReseller;
  if (reseller.status !== "active") return null;

  // Le BDC hébergé n'existe que si le revendeur a connecté Stripe ou
  // PayPal pour ce plan. S'il n'utilise que Systeme.io, c'est SON BDC
  // SIO qui sert, pas cette page.
  const payment = normalizePlanPayment((reseller.checkout_urls ?? {})[plan]);
  if (!payment.stripe && !payment.paypal) return null;

  return {
    name: reseller.name,
    stripeUrl: payment.stripe ?? null,
    paypalUrl: payment.paypal ?? null,
    priceLabel: (reseller.pricing ?? {})[plan]?.label ?? null,
  };
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

          {order.priceLabel ? (
            <div className="text-center">
              <span className="text-3xl font-bold">{order.priceLabel}</span>
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

          <div className="space-y-2">
            {order.stripeUrl ? (
              <a
                href={order.stripeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full rounded-full bg-primary text-primary-foreground font-semibold py-3 hover:opacity-90 transition-opacity"
              >
                {tOrder("payCardCta")}
                <ArrowRight className="h-4 w-4" />
              </a>
            ) : null}
            {order.paypalUrl ? (
              <a
                href={order.paypalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full rounded-full border border-primary text-primary font-semibold py-3 hover:bg-primary/5 transition-colors"
              >
                {tOrder("payPaypalCta")}
                <ArrowRight className="h-4 w-4" />
              </a>
            ) : null}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            {tOrder("accessNote")}
          </p>
        </div>

        <p className="text-[11px] text-muted-foreground text-center">
          {tOrder("poweredBy")}
        </p>
      </div>
    </div>
  );
}
