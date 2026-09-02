// app/generateurs/page.tsx
//
// L'ACCUEIL : retrouver, ou créer. Béné, 2 septembre 2026 : "ajoute une
// étape avec le choix -> 'mes contenus générés' > 3 blocs pour classer
// les 3 types de contenus générés OU 'générer de nouveaux contenus' >
// 3 générateurs."
//
// Le compteur de contenus est lu ICI : une carte qui annonce "12
// contenus" se clique, une carte muette ne se clique pas. Et il est lu
// avec le repli du store : "je n'ai pas pu regarder" et "il n'y a rien"
// sont deux réponses différentes, donc une erreur de lecture affiche la
// carte SANS compteur, jamais "0".
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
import { lireContenus } from "@/lib/generateurs/contenusStore";
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

  const { contenus, erreur } = await lireContenus(user.id);

  return (
    <GenerateursClient
      userEmail={user.email ?? ""}
      autorise={canUseAIAnalysis(plan, { userId: user.id, email: user.email ?? null })}
      lienPlans="/settings?tab=account"
      nbContenus={erreur ? 0 : contenus.length}
    />
  );
}
