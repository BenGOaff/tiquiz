// app/pilotage/page.tsx
//
// L'ACCUEIL DU CENTRE DE PILOTAGE.
//
// Béné : "un peu comme Systeme.io = je veux voir mes derniers contacts,
// mes dernières ventes, etc, un aperçu général clair, sans blabla."
//
// L'ordre de la page suit la règle 4 du plan : **ce qui demande une
// action passe avant ce qui informe.** Une alerte qu'il faut aller
// chercher au fond d'un onglet n'est pas une alerte, et c'est
// exactement comme ça qu'une vente encaissée sans compte est restée
// invisible.

import type { Metadata } from "next";

import { AccueilPilotage } from "@/components/pilotage/AccueilPilotage";

export const metadata: Metadata = { title: "Pilotage" };

export default function PilotageAccueilPage() {
  return <AccueilPilotage />;
}
