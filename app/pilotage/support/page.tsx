// app/pilotage/support/page.tsx
//
// Route STATIQUE : elle gagne sur `[section]`, donc la page "à venir"
// disparaît d'elle même, sans qu'on retire une ligne là-bas.

import type { Metadata } from "next";

import { SupportPilotage } from "@/components/pilotage/SupportPilotage";

export const metadata: Metadata = { title: "Support" };

export default function PilotageSupportPage() {
  return <SupportPilotage />;
}
