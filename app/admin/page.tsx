// app/admin/page.tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { isAdminEmail } from "@/lib/adminEmails";
import AppShell from "@/components/AppShell";
import AdminDashboard from "@/components/admin/AdminDashboard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("admin") };
}

export default async function AdminPage() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) redirect("/dashboard");
  const t = await getTranslations("metadata.pages");
  return (
    <AppShell userEmail={user.email ?? ""} headerTitle={t("admin")}>
      <AdminDashboard />
    </AppShell>
  );
}
