// app/dashboard/page.tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import DashboardClient from "@/components/dashboard/DashboardClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("dashboard") };
}

export default async function DashboardPage() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <DashboardClient userEmail={user.email ?? ""} />;
}
