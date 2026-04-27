// app/quizzes/page.tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import QuizzesClient from "./QuizzesClient";

export async function generateMetadata(): Promise<Metadata> {
  // Falls back to the legacy "quizzes" key if the new "projects" key isn't
  // available — gracefully handles in-flight i18n updates.
  const t = await getTranslations("metadata.pages");
  let title = "";
  try {
    title = t("projects");
  } catch {
    title = t("quizzes");
  }
  return { title };
}

export default async function QuizzesPage() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <QuizzesClient userEmail={user.email ?? ""} />;
}
