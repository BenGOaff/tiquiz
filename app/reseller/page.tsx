// app/reseller/page.tsx
//
// Panel revendeur (phase 1). Accessible uniquement aux users qui ont une
// ligne `resellers` active (créée par Béné via l'admin). Les autres sont
// renvoyés au dashboard sans explication (la page n'est pas découvrable).

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import AppShell from "@/components/AppShell";
import ResellerDashboard from "@/components/reseller/ResellerDashboard";
import { getResellerSession } from "@/lib/reseller";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("reseller");
  return { title: t("title") };
}

export default async function ResellerPage() {
  const session = await getResellerSession();
  if (!session) redirect("/dashboard");

  const t = await getTranslations("reseller");
  return (
    <AppShell userEmail={session.email ?? ""} headerTitle={t("title")}>
      <ResellerDashboard resellerName={session.reseller.name} />
    </AppShell>
  );
}
