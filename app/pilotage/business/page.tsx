import type { Metadata } from "next";

import { BusinessPilotage } from "@/components/pilotage/BusinessPilotage";

export const metadata: Metadata = { title: "Business" };

export default function PilotageBusinessPage() {
  return <BusinessPilotage />;
}
