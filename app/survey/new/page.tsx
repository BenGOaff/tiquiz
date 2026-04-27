// app/survey/new/page.tsx
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import SurveyNewShell from "./SurveyNewShell";

export const metadata = { title: "Nouveau sondage – Tiquiz" };

export default async function NewSurveyPage() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <SurveyNewShell userEmail={user.email ?? ""} />;
}
