// app/api/public/stats/route.ts
//
// Endpoint public de "preuve sociale". Renvoie 2 compteurs globaux :
//   • quizzes : nombre de quiz PUBLIÉS sur la plateforme (status='published').
//     On exclut volontairement les drafts/archived → chiffre crédible.
//   • leads   : total des leads capturés (table quiz_leads, source de vérité
//     côté capture — cf. pitfall M).
//
// Cible : intégration sur la sales page Systeme.io de Béné + composant
// <SocialProofCounter /> côté dashboard Tiquiz. CORS ouvert pour qu'un
// snippet JS dans n'importe quel site distant puisse fetch.
//
// Cache : 5 min côté CDN, 60s stale-while-revalidate. Les compteurs n'ont
// PAS besoin d'être au seconde près ; on évite un COUNT(*) à chaque hit
// (réseau publicitaire → potentiellement bcp d'impressions/min).

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
// 5 min de cache côté Next.js + headers Cache-Control pour la couche CDN /
// Cloudflare. Pas de `force-dynamic` : on VEUT la mise en cache.
export const revalidate = 300;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  // 5 min de fresh + 60s de stale-while-revalidate → la prochaine requête
  // après l'expiration sert l'ancienne valeur instantanément, et Next la
  // refresh en arrière-plan.
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
};

export async function OPTIONS() {
  // Préflight CORS pour les browsers (Systeme.io fait du fetch direct → pas
  // de préflight en pratique sur GET sans header custom, mais on garde
  // l'OPTIONS au cas où des integrators ajouteraient un header).
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  try {
    // COUNT(*) sur les 2 tables en parallèle. Supabase head:true ne ramène
    // aucune ligne — uniquement le count. Performance OK sur les volumes
    // actuels ; si ça devient lent (>500ms), switcher vers une table
    // d'agrégats refreshée par cron OU pg_class.reltuples (approximatif).
    const [quizzesRes, leadsRes] = await Promise.all([
      supabaseAdmin
        .from("quizzes")
        .select("id", { count: "exact", head: true })
        .eq("status", "published"),
      supabaseAdmin
        .from("quiz_leads")
        .select("id", { count: "exact", head: true }),
    ]);

    if (quizzesRes.error) throw quizzesRes.error;
    if (leadsRes.error) throw leadsRes.error;

    return NextResponse.json(
      {
        ok: true,
        quizzes: quizzesRes.count ?? 0,
        leads: leadsRes.count ?? 0,
        updated_at: new Date().toISOString(),
      },
      { headers: CORS_HEADERS },
    );
  } catch (e) {
    console.error("[/api/public/stats] error:", e);
    // On retourne ok:false + 0/0 plutôt qu'un 500 nu : les integrators
    // (snippet Systeme.io) peuvent afficher un fallback sans s'effondrer.
    return NextResponse.json(
      {
        ok: false,
        quizzes: 0,
        leads: 0,
        error: "Unable to compute stats.",
      },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
