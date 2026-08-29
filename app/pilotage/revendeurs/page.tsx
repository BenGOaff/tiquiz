// app/pilotage/revendeurs/page.tsx
//
// Route STATIQUE : elle gagne sur `[section]`.

import type { Metadata } from "next";

import { RevendeursPilotage } from "@/components/pilotage/RevendeursPilotage";

export const metadata: Metadata = { title: "Revendeurs" };

export default function PilotageRevendeursPage() {
  return <RevendeursPilotage />;
}
