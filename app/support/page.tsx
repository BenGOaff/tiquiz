// app/support/page.tsx
//
// ÉCRIRE À UN HUMAIN, DEPUIS TIQUIZ.
//
// Béné, 22 août : "côté support (...) c'est carré ou pas encore ?"
//
// Pas encore : le centre d'aide existait (57 articles servis par
// Tipote), mais aucun chemin ne menait à quelqu'un. Une cliente bloquée
// n'avait que l'adresse du pied de page, si elle la trouvait.
//
// -- PUBLIQUE, ET C'EST LE POINT ---------------------------------------
//
// Aucune redirection vers /login : celle qui a le plus besoin d'aide est
// celle qui n'arrive pas à se connecter. Quand une session existe, on
// pré-remplit son adresse ; sinon elle la saisit.

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import AppShell from "@/components/AppShell";
import SupportForm from "@/components/support/SupportForm";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("supportForm");
  return { title: t("title") };
}

export default async function SupportPage() {
  const t = await getTranslations("supportForm");

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let prenom: string | null = null;
  if (user?.id) {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("first_name")
      .eq("user_id", user.id)
      .maybeSingle();
    prenom = (data as { first_name?: string | null } | null)?.first_name ?? null;
  }

  const formulaire = (
    <div className="mx-auto max-w-2xl space-y-5 p-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <SupportForm emailConnecte={user?.email ?? null} nomConnecte={prenom} />
    </div>
  );

  // Connectée : la page vit dans l'app, avec sa barre latérale. Non
  // connectée : elle vit seule, parce qu'une barre latérale pleine de
  // liens qui renverraient vers /login serait une deuxième impasse.
  if (!user) {
    return <div className="min-h-screen bg-background">{formulaire}</div>;
  }

  return (
    <AppShell userEmail={user.email ?? ""} headerTitle={t("title")}>
      {formulaire}
    </AppShell>
  );
}
