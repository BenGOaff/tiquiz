// lib/publicHost.ts
//
// L'ADRESSE CANONIQUE QU'ON ANNONCE À GOOGLE.
//
// Béné, 26 août 2026 : "je n'ai PAS tiquiz.com il n'est PAS à moi ce
// domaine... donc fais ce qu'il faut pour supprimer ce problème !"
//
// -- CE QUI SE PASSAIT, ET C'EST PIRE QU'UNE FAUTE DE FRAPPE ----------
//
// `https://tiquiz.com` était le repli écrit en dur de quatre endroits
// qui s'adressent tous aux moteurs de recherche : `robots.ts`,
// `sitemap.ts`, `llms.txt` et le `metadataBase` du layout. En prod le
// repli gagnait, donc :
//
//   robots.txt   Host: https://tiquiz.com
//                Sitemap: https://tiquiz.com/sitemap.xml
//   sitemap.xml  <loc>https://tiquiz.com/...</loc>   (toutes)
//
// Vérifié le 26 août : ce domaine ne répond même pas, et il ne nous
// appartient pas. On envoyait donc le référencement de nos pages vers
// une adresse qui appartient à quelqu'un d'autre, pendant que la page
// de vente déclarait sa canonique sur `tiquiz.fr`. Deux affirmations
// contradictoires dans la même seconde, dont une en faveur d'un tiers.
//
// -- LE REPLI N'EST PLUS UNE CONSTANTE ÉCRITE À QUATRE ENDROITS -------
//
// Il se calcule ici, et il dépend de l'hôte qui sert la requête, parce
// que la réponse n'est pas la même selon qui demande. C'est la leçon du
// 2 août : un `??` ne protège que de la variable ABSENTE, jamais de la
// variable FAUSSE. Ici la valeur n'était pas absente, elle était fausse,
// et elle l'est restée des mois sans que rien ne le dise.

import { SALES_HOSTS } from "@/lib/sales/salesHosts";

/** L'app authentifiée. C'est le domaine de Béné, et il répond. */
export const HOTE_APP = "https://quiz.tipote.com";

/** La vitrine publique de Tiquiz. */
export const HOTE_VENTE = "https://tiquiz.fr";

/**
 * Un domaine que nous ne possédons pas, et qui a servi de repli à tout
 * ce qui parle aux moteurs. Il ne doit revenir NULLE PART : le test
 * `tests/logic/domaine-canonique.test.mts` le refuse dans les sources.
 */
export const DOMAINE_ETRANGER = "tiquiz.com";

function normaliser(host: string | null | undefined): string {
  return String(host ?? "").toLowerCase().trim().replace(/:\d+$/, "");
}

/**
 * L'adresse à annoncer pour cette requête.
 *
 * Trois cas, du plus spécifique au plus général :
 *
 * 1. le domaine personnalisé d'une créatrice : lui-même, c'est l'URL
 *    que ses visiteurs voient et celle qu'elle veut indexer ;
 * 2. un domaine de vente (`tiquiz.fr`) : lui-même. C'est le cas qui
 *    manquait, et c'est par lui que `tiquiz.com` sortait ;
 * 3. le reste : l'app.
 *
 * `envUrl` reste prioritaire quand elle est utilisable, pour qu'un
 * environnement de préproduction puisse se nommer. Mais elle ne peut
 * plus imposer un domaine qui n'est pas à nous quand elle est absente :
 * le repli est calculé, plus deviné.
 */
export function hoteCanonique(args: {
  customHost?: string | null;
  host?: string | null;
}): string {
  const custom = normaliser(args.customHost);
  if (custom) return `https://${custom}`;

  const host = normaliser(args.host);
  if (host && Object.prototype.hasOwnProperty.call(SALES_HOSTS, host)) {
    return HOTE_VENTE;
  }

  return HOTE_APP;
}
