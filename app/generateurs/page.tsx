// app/generateurs/page.tsx
//
// LES TROIS CARTES. Béné, 1er septembre 2026 : "sur une page
// générateurs, l'user choisit quel générateur il veut utiliser
// (3 cartes cliquables). Ensuite un nouvel onglet s'ouvre, l'user
// choisit le quiz pour lequel il veut créer, comme sur l'Atelier."
//
// LE PLAN EST LU ICI, CÔTÉ SERVEUR, et passé à l'écran. "Ça doit être
// visible pour les membres gratuits et sans plus, s'ils veulent s'en
// servir on leur propose d'upgrader" : on MONTRE tout, on n'ouvre que
// pour les plans qui y ont droit. Le vrai verrou est dans la route
// (`app/api/generateurs/route.ts`) : un gate posé seulement à l'écran
// laisse la porte de l'API grande ouverte.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { canUseAIAnalysis, PRICING_PLUS } from "@/lib/planLimits";
import GenerateursClient from "./GenerateursClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("generators") };
}

export default async function GenerateursPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profil } = await supabaseAdmin
    .from("profiles")
    .select("plan")
    .eq("user_id", user.id)
    .maybeSingle();
  const plan = (profil as { plan?: string | null } | null)?.plan ?? null;

  return (
    <GenerateursClient
      userEmail={user.email ?? ""}
      autorise={canUseAIAnalysis(plan, { userId: user.id, email: user.email ?? null })}
      lienPlans="/settings?tab=account"
      offrePlus={`${PRICING_PLUS.monthlyPlus.label} (${PRICING_PLUS.monthlyPlus.price})`}
    />
  );
}
