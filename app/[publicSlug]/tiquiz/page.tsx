// app/[publicSlug]/tiquiz/page.tsx
//
// Page de vente repliquee par revendeur : /<handle>/tiquiz. Le param
// dynamique partage le nom du dossier parent ([publicSlug]) mais represente
// ici le HANDLE du revendeur. Les boutons tarifs menent a SES bons de
// commande (/order/<slug>/<plan>) avec SES prix.
//
// 404 si : handle inconnu, revendeur suspendu.

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ResellerSalesPage, {
  type SalesPlanKey,
} from "@/components/sales/ResellerSalesPage";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const YOUTUBE_ID = "weziYlnfztU";
const PLAN_KEYS: SalesPlanKey[] = ["monthly", "yearly", "monthly_plus", "yearly_plus"];

type PageProps = { params: Promise<{ publicSlug: string }> };

interface SalesReseller {
  name: string;
  slug: string | null;
  status: string;
  pricing: Record<string, { amount_cents?: number }>;
  stripe_secret_key_enc: string | null;
  paypal_client_id_enc: string | null;
  paypal_secret_enc: string | null;
}

async function loadByHandle(handle: string) {
  if (!handle) return null;
  const { data, error } = await supabaseAdmin
    .from("resellers")
    .select(
      "name,slug,status,pricing,stripe_secret_key_enc,paypal_client_id_enc,paypal_secret_enc",
    )
    .eq("handle", handle.toLowerCase())
    .maybeSingle();
  if (error || !data) return null;
  const r = data as unknown as SalesReseller;
  if (r.status !== "active" || !r.slug) return null;

  const prices: Partial<Record<SalesPlanKey, number>> = {};
  for (const k of PLAN_KEYS) {
    const c = (r.pricing ?? {})[k]?.amount_cents;
    if (typeof c === "number" && c > 0) prices[k] = c;
  }
  const hasProvider = Boolean(
    r.stripe_secret_key_enc || (r.paypal_client_id_enc && r.paypal_secret_enc),
  );
  return { name: r.name, slug: r.slug, prices, hasProvider };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { publicSlug } = await params;
  const reseller = await loadByHandle(publicSlug);
  if (!reseller) return { title: "Tiquiz" };
  return {
    title: `Tiquiz - ${reseller.name}`,
    description:
      "Cree des quiz viraux qui attirent du trafic qualifie et transforment tes visiteurs en clients, connectes a Systeme.io.",
  };
}

export default async function ResellerTiquizSalesPage({ params }: PageProps) {
  const { publicSlug } = await params;
  const reseller = await loadByHandle(publicSlug);
  if (!reseller) notFound();

  return (
    <ResellerSalesPage
      resellerName={reseller.name}
      slug={reseller.slug}
      youtubeId={YOUTUBE_ID}
      hasProvider={reseller.hasProvider}
      prices={reseller.prices}
    />
  );
}
