// app/quizzes/page.tsx
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import QuizzesClient from "./QuizzesClient";

export const metadata = { title: "Mes quiz – Tiquiz" };

export default async function QuizzesPage() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <QuizzesClient userEmail={user.email ?? ""} />;
}
