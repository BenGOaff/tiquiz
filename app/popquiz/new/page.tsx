// Server entry for the popquiz editor (create flow). Pre-loads the
// caller's quizzes so the cue dropdown has options on first render
// without a client roundtrip.

import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import PopquizNewClient from "./PopquizNewClient";

export const metadata = { title: "Nouveau Popquiz – Tiquiz" };

export default async function NewPopquizPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: quizzes } = await supabase
    .from("quizzes")
    .select("id, title")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return <PopquizNewClient quizzes={quizzes ?? []} />;
}
