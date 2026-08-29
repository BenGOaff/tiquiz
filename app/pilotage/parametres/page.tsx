// app/pilotage/parametres/page.tsx
//
// Route STATIQUE : elle gagne sur `[section]`, donc la page "à venir"
// disparaît d'elle même, sans qu'on retire une ligne là-bas.

import type { Metadata } from "next";

import { ParametresPilotage } from "@/components/pilotage/ParametresPilotage";

export const metadata: Metadata = { title: "Paramètres" };

export default function PilotageParametresPage() {
  return <ParametresPilotage />;
}
