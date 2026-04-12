import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import LeadsShell from "./LeadsShell";

export const metadata = { title: "Mes leads – Tiquiz" };

export default async function LeadsPage() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <LeadsShell userEmail={user.email ?? ""} />;
}
