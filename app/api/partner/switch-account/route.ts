// app/api/partner/switch-account/route.ts
//
// "CE N'EST PAS LE BON COMPTE" (drame Jocelyne, 4 août 2026).
//
// Jusqu'ici, relier son Atelier à un AUTRE compte Tiquiz supposait de
// comprendre que l'écran de consentement lit la session du navigateur, et
// donc d'aller se déconnecter de Tiquiz dans un autre onglet AVANT de
// revenir cliquer. Personne ne peut deviner ça, et Jocelyne ne l'a pas
// deviné : elle a passé six semaines reliée à un compte vide, et sa
// tentative de reconnexion n'a rien changé.
//
// Cette route ferme la session Tiquiz et renvoie sur l'écran de connexion
// avec le retour vers le consentement DÉJÀ armé. Le `state` anti-CSRF de
// l'Atelier est conservé au passage : sans lui, le retour serait rejeté
// et elle repartirait à zéro.
//
// POST et pas GET : une adresse en GET qui déconnecte peut être déclenchée
// depuis n'importe quelle page tierce (une image, un lien). Le dégât serait
// mineur, mais une déconnexion involontaire au milieu de CE parcours est
// exactement ce qu'on essaie d'arrêter.
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { state?: unknown };
  const state = typeof body.state === "string" ? body.state.slice(0, 256) : "";

  const supabase = await getSupabaseServerClient();
  // Best-effort : si la session est déjà morte, on continue quand même.
  // L'objectif est l'écran de connexion, pas la réussite du signOut.
  await supabase.auth.signOut().catch(() => {});

  // Chemin INTERNE construit ici, jamais repris depuis la requête : une
  // destination fournie par l'appelant serait une redirection ouverte.
  const back = `/connect/formaquiz?state=${encodeURIComponent(state)}`;
  return NextResponse.json({ ok: true, next: `/login?redirect=${encodeURIComponent(back)}` });
}
