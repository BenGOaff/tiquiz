// lib/blog/gabarit.ts
//
// CE QUE LA PAGE D'UN ARTICLE MONTRE, ET DANS QUEL ORDRE.
//
// Béné, 30 août 2026, en regardant la page d'article de Typeform :
// "le contenu est mal réparti, dur à lire. Pourquoi tu gardes pas un
// sticky bar avec les principaux CTA et/ou articles relatifs ? Le TL;DR
// du début doit être mis en évidence, comme sur la plupart des blogs
// sérieux."
//
// Ce qui n'allait pas, MESURÉ et pas supposé : le corps de l'article
// faisait **1168 px de large**, et les images avec lui. Un paragraphe de
// 1168 px à 18 px, c'est 150 caractères par ligne ; l'oeil perd le début
// de la ligne suivante et c'est exactement ce qu'elle décrit. Typeform
// ouvre son corps d'article à ~700 px, et met les 460 px restants au
// service du lecteur : sommaire, partage, articles liés.
//
// -- POURQUOI CE FICHIER EXISTE ---------------------------------------
//
// Deux décisions vivaient dans le JSX de la page, donc n'étaient pas
// testables, donc n'étaient pas testées :
//
//   1. QUEL BLOC EST LE RÉSUMÉ. Il est écrit `<p><strong><em>TL;DR</em>
//      </strong></p>` suivi du texte, dans le MÊME bloc HTML. Rendu tel
//      quel, il ressemble à un paragraphe parmi les autres alors que
//      c'est le seul que la moitié des lecteurs lira.
//   2. QUELS ARTICLES PROPOSER ENSUITE. Prendre "les 3 premiers de
//      l'index" donne les 3 mêmes sur les dix articles, et jamais le
//      plus proche du sujet.
//
// Les deux sont ici, pures, et la page les appelle.

import type { Article, Bloc, ResumeArticle } from "./articles";
import { rubriqueDe } from "./rubriques";

/**
 * Le résumé mis de côté, et le corps sans lui.
 *
 * Le repère est le libellé `TL;DR` en tête du PREMIER bloc, tel que
 * l'import l'a laissé. On ne cherche pas plus loin que le premier bloc
 * exprès : un `TL;DR` cité au milieu d'un article est du texte, pas un
 * chapeau, et le promouvoir en encadré casserait la lecture.
 *
 * Quand il n'y en a pas (l'étude de cas de Jocelyne), on rend
 * `resume: null` et le corps INTACT. Fabriquer un résumé à partir des
 * premières phrases donnerait un encadré qui répète mot pour mot le
 * paragraphe juste en dessous.
 */
export function extraireResume(blocs: readonly Bloc[]): { resume: string | null; corps: Bloc[] } {
  const premier = blocs[0];
  if (!premier || premier.type !== "html") return { resume: null, corps: [...blocs] };

  // `TL;DR`, `TLDR`, avec ou sans emphase : l'import a produit les deux
  // formes selon la page d'origine.
  const marqueur = /^\s*<p>\s*(?:<(?:strong|b|em|i)>\s*){0,3}TL\s*;?\s*DR\s*(?:<\/(?:strong|b|em|i)>\s*){0,3}<\/p>/i;
  if (!marqueur.test(premier.html)) return { resume: null, corps: [...blocs] };

  const resume = premier.html.replace(marqueur, "").trim();
  // Un bloc qui ne contenait QUE le libellé n'est pas un résumé : on le
  // laisse disparaître plutôt que de poser un encadré vide.
  if (!resume) return { resume: null, corps: blocs.slice(1) };
  return { resume, corps: blocs.slice(1) };
}

/**
 * Les articles à lire ensuite, LES PLUS PROCHES d'abord.
 *
 * Ordre de priorité :
 *   1. la même rubrique (c'est le voisinage le plus sûr : elle est
 *      posée à la main dans `rubriques.ts`, pas devinée) ;
 *   2. les mots partagés avec le titre courant, hors mots vides ;
 *   3. la fraîcheur, pour départager.
 *
 * On rend toujours `combien` articles tant qu'il en existe : une
 * rubrique à un seul article laisserait sinon un rail à moitié vide, et
 * un rail à moitié vide se lit comme une page cassée.
 */
export function articlesVoisins(
  courant: ResumeArticle | Article,
  tous: readonly ResumeArticle[],
  combien = 3,
): ResumeArticle[] {
  const maRubrique = rubriqueDe(courant.slug)?.id ?? null;
  const mesMots = motsSignifiants(courant.titre);

  return tous
    .filter((a) => a.slug !== courant.slug)
    .map((a) => {
      const memeRubrique = maRubrique !== null && rubriqueDe(a.slug)?.id === maRubrique;
      const communs = motsSignifiants(a.titre).filter((m) => mesMots.includes(m)).length;
      return { a, score: (memeRubrique ? 100 : 0) + communs };
    })
    .sort((x, y) => y.score - x.score || (x.a.publieLe < y.a.publieLe ? 1 : -1))
    .slice(0, combien)
    .map((x) => x.a);
}

// Les mots trop fréquents ne rapprochent rien : "quiz" est dans neuf
// titres sur dix, il ferait de tous les articles des voisins de tous
// les autres.
const MOTS_VIDES = new Set([
  "avec", "dans", "pour", "sans", "quiz", "les", "des", "une", "the", "que", "qui", "sur",
  "ton", "tes", "mon", "mes", "son", "ses", "est", "par", "plus", "tout", "comment", "faire",
]);

function motsSignifiants(titre: string): string[] {
  return String(titre ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((m) => m.length >= 3 && !MOTS_VIDES.has(m));
}
