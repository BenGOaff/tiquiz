// lib/embed/echecGenerateur.ts
//
// LA RAISON D'UN ÉCHEC DU GÉNÉRATEUR PUBLIC, ET LA PHRASE QUI VA AVEC.
//
// Tâche #55 (10 septembre 2026). La route `/api/embed/quiz/generate`
// rendait dix phrases FRANÇAISES et l'écran les recopiait telles quelles
// (`setError(payload.error)`, `err.message`) : sur `/en/generateur-de-
// quiz`, un visiteur anglophone lisait "JSON IA invalide. Réessaie."
//
// La règle du 3 septembre : le serveur rend une RAISON, l'écran la
// traduit. Ce module est la moitié PURE de l'écran : il prend un corps
// de réponse (ou un événement `error` du flux) et rend la CLÉ du
// dictionnaire de l'embed (`components/embed/embed-i18n.ts`), jamais
// une phrase. La langue reste celle de l'ÉCRAN (la prop `locale`), pas
// celle d'un cookie : c'est ce qui garde tout l'écran dans une seule
// langue (règle du 8 septembre).
//
// -- POURQUOI LE DICTIONNAIRE DE L'EMBED, ET PAS `erreursIa` -----------
//
// `hooks/useEchecIa.ts` lit next-intl, dont la langue vient du cookie
// ou de l'adresse. Le générateur, lui, reçoit sa langue en PROP (dans
// une iframe, c'est la page hôte qui la donne). Deux sources de langue
// sur un même écran, c'est un message d'erreur en français sous un
// formulaire anglais. Les phrases sont donc dans le dictionnaire de
// l'embed, et un test exige qu'elles restent IDENTIQUES à celles de
// `messages/{fr,en}.json` : deux copies qui ne peuvent pas diverger.

import { FENETRE_HEURES, LIMITE_PAR_EMAIL, LIMITE_PAR_IP } from "@/lib/embed/limites";
import type { RaisonIa } from "@/lib/ia/echecIa";

/**
 * Les raisons que cette route peut rendre : les neuf de `RaisonIa`, plus
 * les trois refus de VALIDATION (le visiteur a mal rempli, et ça se dit
 * autrement qu'une panne).
 */
export type RaisonGenerateur = RaisonIa | "sujet" | "audience" | "objectif";

const RAISONS: ReadonlySet<string> = new Set<RaisonGenerateur>([
  "busy",
  "too_long",
  "refused",
  "unreachable",
  "empty",
  "unreadable",
  "rate_limited",
  "not_configured",
  "generic",
  "sujet",
  "audience",
  "objectif",
]);

/** La clé du dictionnaire de l'embed pour chaque raison. */
export const CLE_PAR_RAISON: Record<RaisonGenerateur, string> = {
  busy: "errBusy",
  too_long: "errTooLong",
  refused: "errRefused",
  unreachable: "errUnreachable",
  empty: "errEmpty",
  unreadable: "errUnreadable",
  rate_limited: "errQuota",
  not_configured: "errNotConfigured",
  generic: "errGeneric",
  sujet: "errTopic",
  audience: "errAudience",
  objectif: "errGeneric",
};

/**
 * La raison portée par un corps de réponse ou un événement `error`.
 *
 * Une raison inconnue, un champ `error` de l'ancienne forme, un corps
 * qui n'est pas un objet : `generic`. On ne recopie JAMAIS un `error`
 * à l'écran, c'est exactement ce qui affichait du français à un
 * anglophone.
 */
export function raisonDuCorps(corps: unknown): RaisonGenerateur {
  if (!corps || typeof corps !== "object") return "generic";
  const brut = (corps as Record<string, unknown>).reason;
  return typeof brut === "string" && RAISONS.has(brut) ? (brut as RaisonGenerateur) : "generic";
}

/**
 * Les nombres que la phrase du quota affiche. Ils viennent du corps quand
 * la route les a donnés, sinon des bornes du module PUR : un message qui
 * annonce un délai plus court que le vrai fait revenir quelqu'un pour
 * rien (leçon du 8 septembre).
 */
export function bornesDuQuota(corps: unknown): { n: number; h: number } {
  const c = (corps && typeof corps === "object" ? corps : {}) as Record<string, unknown>;
  const n = Number(c.parLimite);
  const h = Number(c.fenetreHeures);
  return {
    n: Number.isFinite(n) && n > 0 ? n : Math.max(LIMITE_PAR_EMAIL, LIMITE_PAR_IP),
    h: Number.isFinite(h) && h > 0 ? h : FENETRE_HEURES,
  };
}

/**
 * La phrase à afficher, dans la langue de l'écran. `t` est le
 * dictionnaire de l'embed ; une clé absente retombe sur `errGeneric`,
 * jamais sur la clé elle même (le "Résultat 4" du 1er septembre).
 */
export function phraseDEchec(corps: unknown, t: Record<string, string>): string {
  const raison = raisonDuCorps(corps);
  const cle = CLE_PAR_RAISON[raison];
  const phrase = t[cle] ?? t.errGeneric ?? "";
  if (raison !== "rate_limited") return phrase;
  const { n, h } = bornesDuQuota(corps);
  return phrase.replace("{n}", String(n)).replace("{h}", String(h));
}
