import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import PopquizNewClient from "./PopquizNewClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("newPopquiz") };
}

export default async function NewPopquizPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Status comes along so the editor can flag draft quizzes — the
  // popquiz overlay iframes /q/[id] which only serves active quizzes,
  // so a draft would render an empty embed.
  const { data: quizzes } = await supabase
    .from("quizzes")
    .select("id, title, status")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <PopquizNewClient userEmail={user.email ?? ""} quizzes={quizzes ?? []} />
  );
}
