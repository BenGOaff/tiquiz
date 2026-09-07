import type { Metadata } from "next";

import { TraficPilotage } from "@/components/pilotage/TraficPilotage";

export const metadata: Metadata = { title: "Trafic et conversions" };

export default function PilotageTraficPage() {
  return <TraficPilotage />;
}
