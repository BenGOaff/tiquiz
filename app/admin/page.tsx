// app/admin/page.tsx
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { isAdminEmail } from "@/lib/adminEmails";
import AppShell from "@/components/AppShell";
import AdminDashboard from "@/components/admin/AdminDashboard";

export const metadata = { title: "Admin – Tiquiz" };

export default async function AdminPage() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) redirect("/dashboard");
  return (
    <AppShell userEmail={user.email ?? ""} headerTitle="Admin">
      <AdminDashboard />
    </AppShell>
  );
}
