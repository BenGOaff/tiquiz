import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import StatsShell from "./StatsShell";

export const metadata = { title: "Statistiques – Tiquiz" };

export default async function StatsPage() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <StatsShell userEmail={user.email ?? ""} />;
}
