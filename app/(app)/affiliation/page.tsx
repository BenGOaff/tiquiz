// app/(app)/affiliation/page.tsx
// Espace Affiliation de l'Atelier du Quiz. Présente l'offre (70% sur la
// vente + 40% récurrent Tiquiz), construit le lien affilié Systeme.io, et
// affiche un kit de promo personnalisé selon le business de l'élève.
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/parcours";
import { getAffiliateGains, type AffiliateGains } from "@/lib/affiliateTracking";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { AffiliationClient, type AffiliateAsset } from "./AffiliationClient";

export const metadata = {
  title: "Affiliation - L'Atelier du Quiz",
};

export default async function AffiliationPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  const p = viewer.profile;
  const sa = p?.sio_affiliate_id ?? "";
  // Vrais gains depuis les commissions attribuées par les webhooks Systeme.io.
  const gains: AffiliateGains | null = sa ? await getAffiliateGains(sa) : null;

  // Visuels déposés par l'admin, à récupérer par les affiliés.
  const { data: assetRows } = await supabaseAdmin
    .from("affiliate_assets")
    .select("id, title, description, kind, url, file_type")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  const assets = (assetRows ?? []) as AffiliateAsset[];

  const emailOverrides =
    (p as { affiliate_email_overrides?: Record<string, { subject?: string | null; bodyHtml?: string | null }> } | null)
      ?.affiliate_email_overrides ?? {};

  return (
    <AffiliationClient
      firstName={p?.full_name ?? null}
      niche={p?.niche ?? null}
      activityType={p?.activity_type ?? null}
      initialAffiliateId={sa}
      gains={gains}
      assets={assets}
      emailOverrides={emailOverrides}
    />
  );
}
