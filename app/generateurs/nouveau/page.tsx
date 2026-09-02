// app/generateurs/nouveau/page.tsx
//
// LES TROIS GÉNÉRATEURS. Cet écran était l'accueil jusqu'au 2 septembre ;
// il est passé derrière le choix "générer / retrouver" (Béné).
//
// Une route STATIQUE à côté de `/generateurs/[generateur]` : Next fait
// gagner le statique, et `GENERATEURS` est une liste fermée de trois
// mots qui ne contient ni "nouveau" ni "mes-contenus". La page dynamique
// répond `notFound()` sur tout le reste, donc rien ne peut se croiser.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { canUseAIAnalysis, PRICING_PLUS } from "@/lib/planLimits";
import NouveauClient from "./NouveauClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("generators") };
}

export default async function NouveauGenerateurPage() {
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
    <NouveauClient
      userEmail={user.email ?? ""}
      autorise={canUseAIAnalysis(plan, { userId: user.id, email: user.email ?? null })}
      lienPlans="/settings?tab=account"
      offrePlus={`${PRICING_PLUS.monthlyPlus.label} (${PRICING_PLUS.monthlyPlus.price})`}
    />
  );
}
