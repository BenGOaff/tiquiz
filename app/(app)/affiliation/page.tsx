// app/(app)/affiliation/page.tsx
// Espace Affiliation de l'Atelier du Quiz. Présente l'offre (70% sur la
// vente + 40% récurrent Tiquiz), construit le lien affilié Systeme.io, et
// affiche un kit de promo personnalisé selon le business de l'élève.
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/parcours";
import { getAffiliateGains, type AffiliateGains } from "@/lib/affiliateTracking";
import { AffiliationClient } from "./AffiliationClient";

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

  return (
    <AffiliationClient
      firstName={p?.full_name ?? null}
      niche={p?.niche ?? null}
      activityType={p?.activity_type ?? null}
      initialAffiliateId={sa}
      gains={gains}
    />
  );
}
