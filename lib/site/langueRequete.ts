// lib/site/langueRequete.ts
//
// LA LANGUE QUE L'ADRESSE ANNONCE, LUE PAR UNE PAGE SERVEUR.
//
// Le middleware réécrit `/en/<chemin>` vers `/<chemin>` et pose la
// langue dans un en-tête de requête (`ENTETE_LANGUE`). Une page servie
// après cette réécriture ne voit donc plus le `/en/` dans son chemin :
// sans cette lecture, elle ne peut pas savoir sous quelle adresse elle
// est servie, donc elle ne peut pas écrire sa canonique.
//
// -- POURQUOI CE N'EST PAS `getLocale()` -------------------------------
//
// Les deux répondent la même chose sur `/en/tarifs`, et PAS sur
// `/tarifs` visité par quelqu'un dont le cookie dit "en" :
//
//   getLocale()          -> "en"   la langue du TEXTE affiché
//   langueDeLUrlServeur -> null   l'adresse, elle, ne dit rien
//
// La canonique se lit sur l'ADRESSE, jamais sur le texte : sinon deux
// personnes verraient deux canoniques différentes pour la même URL, et
// c'est celle du robot qui compte.
//
// Ce module lit `next/headers`, donc il ne vit pas dans `langues.ts` :
// celui là reste PUR, donc testable par le runner natif.

import { headers } from "next/headers";

import { ENTETE_LANGUE, LANGUE_SANS_PREFIXE, estLanguePublique, type LanguePublique } from "@/lib/site/langues";

/** La langue dite par l'URL, ou `null` quand l'adresse ne se prononce pas. */
export async function langueDeLUrlServeur(): Promise<LanguePublique | null> {
  try {
    const h = await headers();
    const dite = h.get(ENTETE_LANGUE) ?? "";
    return estLanguePublique(dite) ? dite : null;
  } catch {
    // Pas de requête en cours (build, script) : l'adresse ne dit rien.
    return null;
  }
}

/**
 * La langue de l'ADRESSE, avec son repli.
 *
 * C'est celle qui décide la canonique et les `hreflang`. Aucune adresse
 * préfixée -> la langue sans préfixe, qui est l'URL déjà indexée.
 */
export async function langueCanonique(): Promise<LanguePublique> {
  return (await langueDeLUrlServeur()) ?? LANGUE_SANS_PREFIXE;
}
