// lib/embed/rateLimit.ts
// Garde-fou du générateur PUBLIC (aucun compte demandé), adossé à la
// base : on compte les lignes de `embed_quiz_sessions` pour une même
// adresse ou une même IP. Une requête indexée par appel, aucune
// dépendance de plus dans `npm ci`.
//
// ── DEUX QUIZ PAR RÉSEAU, ET LA FENÊTRE EST DE 24 H ──────────────────
//
// Béné, 8 septembre 2026 : "Limiter à 2 quiz générés gratos pour une
// meme adresse IP."
//
// C'était 10 par heure, et ça n'a plus rien d'anodin depuis le même
// jour : le générateur public écrit désormais avec le MÊME modèle que
// l'éditeur payant (lib/quiz/modeleGeneration), donc chaque génération
// coûte ce qu'elle coûte à une cliente qui paie, sur une page publique
// et sans compte.
//
// **LA FENÊTRE EST DE 24 H, PAS "À VIE", ET C'EST UNE DÉCISION.** Une
// adresse IP ne désigne pas une personne : en 4G, un opérateur en
// partage une seule entre des milliers d'abonnés (CGNAT), et un bureau,
// un espace de coworking ou une salle de formation sortent tous par la
// même. Bloquer à vie sur ce signal fermerait la porte à des inconnus
// qui n'ont jamais rien généré, et personne ne le verrait jamais : ils
// partiraient, c'est tout.
//
// 24 h borne donc la dépense (deux quiz par réseau et par jour) sans
// condamner définitivement quelqu'un pour l'IP qu'on lui a attribuée.
// Si Béné veut plus strict, c'est UNE constante à changer, dans
// `lib/embed/limites.ts`.
//
// Ce garde-fou reste un garde-fou de COÛT, pas une frontière de
// sécurité : un botnet qui tourne sur mille IP passe. Ce qui l'arrête
// vraiment, c'est un plafond de dépense, et il n'existe pas encore
// (voir `ANTHROPIC_EMBED_DAILY_BUDGET`, nommée dans un commentaire de
// ce fichier depuis des mois et lue nulle part).

import crypto from "node:crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
// Les trois nombres vivent dans un module PUR : la page publique
// `/generateur-de-quiz` les ANNONCE, et elle ne peut pas importer ce
// fichier ci (il tire `supabaseAdmin`, qui lève au chargement).
import {
  FENETRE_HEURES,
  LIMITE_PAR_EMAIL,
  LIMITE_PAR_IP,
} from "@/lib/embed/limites";

export function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  // Salé avec un secret serveur : une fuite de la base ne doit pas
  // permettre de remonter à une adresse IP par table arc-en-ciel.
  const salt = process.env.EMBED_IP_HASH_SALT ?? "tiquiz-embed-default-salt";
  return crypto.createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export function clientIp(req: Request): string | null {
  // Cloudflare et la plupart des proxys inverses posent la vraie adresse ici.
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip");
}

export type RateLimitResult =
  | { ok: true }
  | { ok: false; reason: "email" | "ip"; retryAfterSec: number };

export async function checkRateLimit(args: {
  email: string | null;
  ipHash: string | null;
}): Promise<RateLimitResult> {
  const debutFenetre = new Date(Date.now() - FENETRE_HEURES * 3600 * 1000).toISOString();
  const retryAfterSec = FENETRE_HEURES * 3600;

  // Par email : le signal le plus fiable, mais on ne l'a qu'à la
  // publication (le générateur ne demande rien avant d'avoir livré).
  if (args.email) {
    const { count: emailCount } = await supabaseAdmin
      .from("embed_quiz_sessions")
      .select("id", { count: "exact", head: true })
      .eq("email", args.email)
      .gte("created_at", debutFenetre);

    if ((emailCount ?? 0) >= LIMITE_PAR_EMAIL) {
      return { ok: false, reason: "email", retryAfterSec };
    }
  }

  // Par réseau : le seul signal disponible au moment de générer, donc
  // celui qui porte la dépense.
  if (args.ipHash) {
    const { count: ipCount } = await supabaseAdmin
      .from("embed_quiz_sessions")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", args.ipHash)
      .gte("created_at", debutFenetre);

    if ((ipCount ?? 0) >= LIMITE_PAR_IP) {
      return { ok: false, reason: "ip", retryAfterSec };
    }
  }

  return { ok: true };
}
