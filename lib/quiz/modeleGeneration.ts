// lib/quiz/modeleGeneration.ts
//
// UN SEUL DÉFAUT DE MODÈLE POUR ÉCRIRE UN QUIZ.
//
// Béné, 8 septembre 2026 : "Tu as bien utilisé le même prompt et la
// même IA pour générer le quiz ? Je trouve le résultat pas ouf." Et,
// sur le générateur public : "j'ai cette erreur : JSON IA invalide.
// Réessaie. au lieu du quiz généré".
//
// ── CE QUI A ÉTÉ MESURÉ, ET ÇA EXPLIQUE LES DEUX ─────────────────────
//
// Le PROMPT était bien le même : les deux routes appellent
// `buildQuizGenerationPrompt`, et le parsing du JSON est identique
// ligne pour ligne. **Le MODÈLE, non :**
//
//     /api/quiz/generate        -> resolveAnthropicModel(..., "opus")
//     /api/embed/quiz/generate  -> resolveAnthropicModel(..., "haiku")
//
// Le générateur public écrivait donc avec le modèle le plus petit de
// la famille, sur un prompt long et un schéma JSON strict. Ça donne
// exactement les deux symptômes qu'elle décrit : un contenu moins bon,
// et du JSON parfois malformé, donc "JSON IA invalide" sur l'écran qui
// doit donner envie.
//
// ── ET J'AVAIS ÉCRIT LE CONTRAIRE, À MOITIÉ ──────────────────────────
//
// L'AGENTS.md du 2 septembre dit : "Le prompt, lui, était déjà le même
// des deux côtés : c'est vérifié, pas supposé." C'était VRAI, et cette
// phrase a servi de preuve que la génération était identique, ce qui
// était FAUX. C'est mot pour mot la faute du 3 septembre : une phrase
// exacte sur une moitié laisse croire l'autre moitié.
//
// ── POURQUOI UNE FONCTION ET PAS DEUX LIGNES ─────────────────────────
//
// Parce que deux résolutions écrites séparément ont DÉJÀ divergé, et
// que la divergence a coûté la qualité du seul écran que voit un
// visiteur froid. Le DÉFAUT est donc partagé : il ne peut plus bouger
// d'un côté sans bouger de l'autre.
//
// La SURCHARGE, elle, reste par surface, et c'est voulu : le générateur
// public est gratuit et sans compte, donc Béné doit pouvoir le
// redescendre d'un cran si la facture monte, sans toucher à ce que
// paient ses clientes. `ANTHROPIC_EMBED_MODEL` sert exactement à ça.

import { resolveAnthropicModel } from "@/lib/anthropicModel";

/**
 * Où l'on écrit le quiz. C'est un PARAMÈTRE OBLIGATOIRE, jamais deviné :
 * les deux surfaces n'ont pas la même surcharge d'environnement, et
 * c'est la seule chose qui les distingue.
 *
 * `app`    : l'éditeur derrière connexion, pour une cliente qui paie.
 * `public` : le générateur anonyme (/generateur-de-quiz et l'iframe).
 */
export type SurfaceGeneration = "app" | "public";

export function modeleGenerationQuiz(surface: SurfaceGeneration): string {
  // La surcharge du générateur public passe devant, pour elle seule.
  // Absente, on retombe sur le MÊME défaut que l'app : c'est tout
  // l'intérêt de ce module.
  const surcharge = surface === "public"
    ? process.env.ANTHROPIC_EMBED_MODEL
    : undefined;

  return resolveAnthropicModel(
    surcharge || process.env.TIQUIZ_QUIZ_MODEL || process.env.ANTHROPIC_MODEL,
    // Béné (juin 2026) : "toujours la meilleure version de Claude dispo
    // pour la meilleure qualité" sur le contenu. Un quiz est de la
    // rédaction fine, et c'est le livrable.
    "opus",
  );
}
