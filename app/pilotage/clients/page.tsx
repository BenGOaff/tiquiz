// app/pilotage/clients/page.tsx
//
// Route STATIQUE : elle gagne sur `[section]`, donc la page "à venir"
// disparaît d'elle même, sans qu'on retire une ligne là-bas.

import type { Metadata } from "next";

import { ClientsPilotage } from "@/components/pilotage/ClientsPilotage";

export const metadata: Metadata = { title: "Clients et élèves" };

export default function PilotageClientsPage() {
  return <ClientsPilotage />;
}
