// lib/site/langues.ts
//
// LES LANGUES DU SITE PUBLIC, ET L'ADRESSE DE CHACUNE.
//
// Béné, 8 septembre 2026 : "j'ai des users anglophones qui me trouvent
// sur tipote.blog avec les articles en anglais : on doit les récupérer
// sur le blog tiquiz.fr avec les articles et pages en anglais." Puis,
// dans le même message : "je ne veux pas changer les URL actuelles
// parce qu'elles commencent à ranker doucement."
//
// -- CE QUI BLOQUAIT, MESURÉ LE 8 SEPTEMBRE ----------------------------
//
// La langue du site venait du COOKIE `ui_locale` (`i18n/request.ts`), et
// d'aucune autre source. Aucun segment de langue dans aucune URL, aucun
// `hreflang` dans tout le dépôt. Conséquence : `tiquiz.fr/tarifs` était
// UNE seule adresse qui changeait de langue selon le cookie du visiteur,
// et un robot n'envoie jamais de cookie.
//
// Il n'existait donc AUCUNE URL anglaise à indexer. Traduire le texte
// n'y aurait rien changé : ses lecteurs anglophones n'avaient nulle part
// où atterrir.
//
// -- LA LANGUE PAR DÉFAUT NE PORTE PAS DE PRÉFIXE ----------------------
//
// C'est SA contrainte, et c'est la seule forme qui la respecte : le
// français reste exactement là où il est (`/tarifs`, `/blog/<slug>`), et
// l'anglais prend `/en/`. Poser `/fr/` changerait chaque adresse déjà
// indexée, c'est à dire jeter le référencement qu'elle commence à avoir.
//
// -- ET L'URL GAGNE SUR LE COOKIE ---------------------------------------
//
// La règle qui casse en silence si on l'oublie. Sans elle, `/en/tarifs`
// servirait du FRANÇAIS à quelqu'un dont le cookie dit "fr", et Google
// indexerait sous une adresse anglaise le texte de l'autre langue. La
// page s'afficherait très bien : c'est exactement la forme de panne que
// ces dépôts paient le plus cher.
//
// Le cookie garde son rôle, et il ne le perd nulle part : il décide de
// la langue quand l'URL ne se prononce pas (l'app derrière connexion, et
// le français sans préfixe).
//
// -- ON NE DÉCLARE QUE LES LANGUES ÉCRITES ------------------------------
//
// Béné veut les 7 langues à terme. En déclarer 7 aujourd'hui ferait
// pointer des `hreflang` vers des pages qui n'existent pas, donc servir
// du français sous une adresse espagnole. Une langue entre ici le jour
// où son texte existe, pas le jour où on prévoit de l'écrire.

import type { SupportedLocale } from "@/i18n/config";

/**
 * Les langues que le SITE PUBLIC sert vraiment, dans l'ordre.
 *
 * À ne pas confondre avec `SUPPORTED_LOCALES` (7), qui est la langue de
 * l'INTERFACE de l'app : l'éditeur, le viewer et les écrans derrière
 * connexion existent en sept langues depuis des mois. Ce sont deux
 * questions différentes, et les confondre déclarerait cinq langues que
 * le site public n'a pas.
 */
export const LANGUES_PUBLIQUES = ["fr", "en"] as const satisfies readonly SupportedLocale[];

export type LanguePublique = (typeof LANGUES_PUBLIQUES)[number];

/**
 * La langue sans préfixe. Tout ce qui est déjà indexé est écrit dedans,
 * et c'est ce qui rend la bascule sans coût de référencement.
 */
export const LANGUE_SANS_PREFIXE: LanguePublique = "fr";

export function estLanguePublique(v: unknown): v is LanguePublique {
  return typeof v === "string" && (LANGUES_PUBLIQUES as readonly string[]).includes(v);
}

/** Le préfixe d'URL d'une langue. Vide pour la langue par défaut. */
export function prefixeDeLangue(langue: LanguePublique): string {
  return langue === LANGUE_SANS_PREFIXE ? "" : `/${langue}`;
}

/**
 * Découpe une adresse en (langue, chemin nu).
 *
 * Le chemin NU est celui que connaît le routeur Next : c'est lui qu'on
 * réécrit, et c'est lui qui sert de clé pour retrouver les autres
 * langues de la même page. `/en/tarifs` et `/tarifs` ont donc le même
 * chemin nu, `/tarifs`, ce qui est exactement ce qu'un `hreflang` doit
 * apparier.
 */
export function langueDuChemin(pathname: string): {
  langue: LanguePublique;
  cheminNu: string;
  /** Vrai quand la langue vient de l'URL, donc qu'elle gagne sur le cookie. */
  ditDansLUrl: boolean;
} {
  const chemin = pathname.startsWith("/") ? pathname : `/${pathname}`;

  for (const langue of LANGUES_PUBLIQUES) {
    if (langue === LANGUE_SANS_PREFIXE) continue;
    const p = `/${langue}`;
    if (chemin === p || chemin.startsWith(`${p}/`)) {
      const nu = chemin.slice(p.length) || "/";
      return { langue, cheminNu: nu.startsWith("/") ? nu : `/${nu}`, ditDansLUrl: true };
    }
  }

  return { langue: LANGUE_SANS_PREFIXE, cheminNu: chemin, ditDansLUrl: false };
}

/** L'adresse d'un chemin nu dans une langue donnée. */
export function cheminPourLangue(cheminNu: string, langue: LanguePublique): string {
  const nu = cheminNu.startsWith("/") ? cheminNu : `/${cheminNu}`;
  const prefixe = prefixeDeLangue(langue);
  if (!prefixe) return nu;
  return nu === "/" ? prefixe : `${prefixe}${nu}`;
}

/**
 * Les `hreflang` d'une page, prêts pour `alternates.languages` de Next.
 *
 * `x-default` pointe sur la langue SANS PRÉFIXE : c'est la page qu'on
 * sert à quelqu'un dont aucune langue déclarée ne correspond, et c'est
 * aussi celle qui est déjà indexée.
 *
 * -- LES DEUX PARAMÈTRES SONT OBLIGATOIRES, ET POUR DEUX RAISONS ------
 *
 * `langueCourante` décide la CANONIQUE, et la deviner est exactement la
 * panne silencieuse que ce dépôt paie en boucle : un premier jet rendait
 * toujours la première langue disponible, donc CHAQUE page anglaise
 * aurait annoncé la française comme sa version de référence. Google
 * l'aurait crue, l'anglais n'aurait jamais été indexé, et la page se
 * serait affichée parfaitement pendant tout ce temps.
 *
 * `langues` est la liste des langues DISPONIBLES pour cette page : un
 * article traduit en anglais et un article qui n'existe qu'en français
 * ne portent pas les mêmes paires, et déclarer une paire vers une page
 * absente est pire que de n'en déclarer aucune.
 */
export function alternatesDeLangue(
  origine: string,
  cheminNu: string,
  langueCourante: LanguePublique,
  langues: readonly LanguePublique[] = LANGUES_PUBLIQUES,
): { canonical: string; languages: Record<string, string> } | null {
  const base = origine.replace(/\/+$/, "");
  const dispo = LANGUES_PUBLIQUES.filter((l) => langues.includes(l));
  if (dispo.length === 0) return null;

  const languages: Record<string, string> = {};
  for (const l of dispo) languages[l] = `${base}${cheminPourLangue(cheminNu, l)}`;
  if (dispo.includes(LANGUE_SANS_PREFIXE)) {
    languages["x-default"] = `${base}${cheminPourLangue(cheminNu, LANGUE_SANS_PREFIXE)}`;
  }

  // Une page servie dans une langue qu'elle ne DÉCLARE pas (un `?lang=`
  // d'aperçu, un cookie) reste canonique sur la langue sans préfixe :
  // c'est l'adresse qui existe vraiment.
  const canonique = dispo.includes(langueCourante) ? langueCourante : LANGUE_SANS_PREFIXE;
  return { canonical: languages[canonique] ?? languages[dispo[0]], languages };
}

/**
 * L'en-tête que le middleware pose quand la langue vient de l'URL.
 *
 * On passe par un en-tête de REQUÊTE et pas par le chemin réécrit,
 * parce que la page a besoin des DEUX : sa langue (pour son texte et
 * son `og:locale`) et son chemin nu (pour ses `hreflang`). Le même
 * idiome que `CUSTOM_HOST_HEADER`, qui fait déjà voyager l'hôte d'une
 * créatrice à travers une réécriture.
 */
export const ENTETE_LANGUE = "x-tq-langue";
