// app/pilotage/sante/page.tsx
//
// Route STATIQUE : elle gagne sur `[section]`, donc la page "à venir"
// disparaît d'elle même, sans qu'on retire une ligne là-bas.

import type { Metadata } from "next";

import { SantePilotage } from "@/components/pilotage/SantePilotage";

export const metadata: Metadata = { title: "Santé des app" };

export default function PilotageSantePage() {
  return <SantePilotage />;
}
