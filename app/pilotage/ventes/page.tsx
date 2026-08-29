// app/pilotage/ventes/page.tsx
//
// QUI A ACHETÉ QUOI, QUAND, COMMENT, VIA QUI (Béné, 29 août 2026).
//
// "Via qui" ne vit pas dans cette base : c'est l'espace affilié qui sait
// qui a amené quel client. On va donc le CHERCHER, avec son délai
// maximum, et son absence ne prive de rien : la colonne dit "on ne sait
// pas" au lieu de faire disparaître les ventes.

import type { Metadata } from "next";

import { lireAffiliesDistants } from "@/lib/pilotage/affilies";
import { VentesPilotage } from "@/components/pilotage/VentesPilotage";

export const metadata: Metadata = { title: "Ventes" };
export const dynamic = "force-dynamic";

export default async function PilotageVentesPage() {
  const { attributions, etat } = await lireAffiliesDistants();
  return <VentesPilotage attributions={attributions} affiliesLisibles={etat.ok} />;
}
