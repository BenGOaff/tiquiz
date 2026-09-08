// lib/blog/importBlocs.ts
//
// LIRE UNE PAGE SYSTEME.IO, ET LA FUSIONNER AVEC CE QU'ON A DÉJÀ.
//
// Béné, 8 septembre 2026 : "ben il faut corriger, c'est toi qui a
// importé mes articles ! Ou un autre agent mais en tous cas on peut pas
// laisser de la merde !!"
//
// Quatre articles français avaient perdu du contenu à l'import du
// 29 août, et le script qui les avait importés n'existait plus dans le
// dépôt : personne ne pouvait retrouver la cause.
//
// -- POURQUOI CES DÉCISIONS VIVENT ICI ET PAS DANS LE SCRIPT ---------
//
// `scripts/importer-blog-fr.mjs` va chercher les pages sur le réseau :
// aucun test ne peut le lancer. Les décisions, elles, sont PURES, et
// c'est là que le bug s'était installé. Une logique enfermée dans un
// script n'est pas testable, donc elle n'est pas testée : règle du
// 1er août, transposée.
//
// Le script fait les entrées/sorties, ce module décide.

import type { Bloc } from "./articles";

/** Une entité de l'éditeur Systeme.io, telle qu'elle arrive. */
export interface Entite {
  type?: string;
  content?: string;
  html?: string;
  text?: string;
  title?: string;
  linkUrl?: string;
  fileId?: string | number;
  childIds?: string[];
}

export function texteNu(html: unknown): string {
  return String(html ?? "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** Notre gabarit ne connaît que h2 et h3 (`lib/blog/articles.ts`). */
export function niveauDuTitre(html: unknown): 2 | 3 {
  const m = String(html ?? "").match(/<h([1-6])\b/i);
  const n = m ? Number(m[1]) : 2;
  return n <= 2 ? 2 : 3;
}

export function ancre(texte: string): string {
  return texteNu(texte)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Retire d'un bloc brut ce qui n'est pas du contenu.
 *
 * `nettoyerBloc` (`lib/blog/rendu.ts`) retire les BALISES inconnues et
 * garde ce qu'il y a ENTRE. Chacune de ces quatre coupes ferme donc un
 * dégât précis, mesuré le 8 septembre :
 *
 *   - `<style>`  : ses règles CSS se déverseraient EN TEXTE au milieu
 *                  de l'article.
 *   - `<script>` : idem, en pire.
 *   - `<svg>`    : un schéma en ligne rendrait toutes ses étiquettes en
 *                  vrac ("Typeform Plus 50 EUR/mois . pour le
 *                  formulaire Zapier..."). Un SVG est une image.
 *   - `<img>`    : la balise ne s'affiche pas (elle n'est pas dans la
 *                  liste blanche) mais son adresse resterait sur notre
 *                  disque. Tout l'objet du rapatriement des images
 *                  (30 août) est de ne dépendre d'aucun hébergement
 *                  qui n'est pas le nôtre.
 */
export function sansCodeNiStyle(html: unknown): string {
  return String(html ?? "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, "")
    .replace(/<img\b[^>]*>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");
}

/** Ce que la marche a rencontré et n'a pas su poser. */
export interface Restes {
  /** Les types d'entité qu'aucun cas ne traite. */
  perdus: Map<string, number>;
  /** Les vidéos : notre gabarit n'a pas de bloc vidéo. */
  videos: string[];
  /** Les schémas SVG en ligne : notre gabarit n'en rend aucun. */
  schemas: string[];
}

export function restesVides(): Restes {
  return { perdus: new Map(), videos: [], schemas: [] };
}

/**
 * Marche l'arbre d'une page et rend nos blocs.
 *
 * -- LES DEUX CAUSES DU BUG DU 29 AOÛT, ET LEUR CORRECTION -----------
 *
 *   1. `BulletList` N'AVAIT AUCUN CAS. Ce type porte son contenu dans
 *      `.content`, exactement comme un `Text`, et il n'a AUCUN enfant :
 *      il tombait dans le `default:` qui marche les `childIds`, et il
 *      ne produisait rien. Six listes perdues dans un seul article.
 *
 *   2. `RawHtml` ÉTAIT SAUTÉ SANS REGARDER CE QU'IL PORTE, sous la
 *      raison "les RawHtml de ces pages ne portent QUE du JSON-LD".
 *      C'était vrai des quatre pages ANGLAISES, et faux des pages
 *      françaises, où ce sont des blocs de CONTENU (le comparatif des
 *      8 outils, le coût réel, le traitement des données). C'est la
 *      faute du 1er août : une règle écrite pour un cas, appliquée
 *      telle quelle à un autre.
 *
 * ET UN TYPE INCONNU EST SIGNALÉ, jamais avalé. C'est exactement le
 * silence qui a coûté ce chantier.
 */
export function blocsDe(
  ents: Record<string, Entite>,
  racine: Entite,
  fichiers: Record<string, { path?: string }> | undefined,
  restes: Restes,
  slug: string,
): Bloc[] {
  const out: Bloc[] = [];
  const vu = new Set<string>();

  const marcher = (id: string): void => {
    if (vu.has(id)) return;
    vu.add(id);
    const e = ents[id];
    if (!e) return;

    switch (e.type) {
      case "Headline": {
        const contenu = e.content ?? e.html ?? "";
        const texte = texteNu(contenu);
        if (texte) out.push({ type: "titre", niveau: niveauDuTitre(contenu), texte, id: ancre(texte) });
        return;
      }
      case "Text":
      case "BulletList": {
        const contenu = e.content ?? e.html ?? "";
        if (texteNu(contenu)) out.push({ type: "html", html: contenu });
        return;
      }
      case "RawHtml": {
        const brut = e.content ?? e.html ?? "";
        if (/<svg\b/i.test(String(brut))) restes.schemas.push(`${slug} : un schema SVG en ligne`);
        const contenu = sansCodeNiStyle(brut);
        if (texteNu(contenu)) out.push({ type: "html", html: contenu });
        return;
      }
      case "Image": {
        const f = fichiers?.[String(e.fileId)];
        if (f?.path) out.push({ type: "image", src: f.path, alt: "" });
        return;
      }
      case "Button": {
        const texte = texteNu(e.text ?? "");
        if (texte) out.push({ type: "cta", texte, url: e.linkUrl ?? "" });
        return;
      }
      case "Faq": {
        const items: { question: string; reponse: string }[] = [];
        for (const c of e.childIds ?? []) {
          const it = ents[c];
          if (!it) continue;
          vu.add(c);
          const reponse = (it.childIds ?? [])
            .map((k) => {
              vu.add(k);
              return ents[k]?.content ?? ents[k]?.html ?? "";
            })
            .join("");
          if (it.title) items.push({ question: texteNu(it.title), reponse });
        }
        if (items.length) out.push({ type: "faq", questions: items });
        return;
      }
      // Le sommaire est reconstruit par notre gabarit à partir des
      // titres : en garder un deuxième donnerait deux sommaires qui
      // divergent au premier renommage. Et un compte à rebours importé
      // serait une fausse urgence, l'interdit numéro un de Béné.
      case "ContentTable":
      case "HorizontalLine":
      case "Countdown":
        return;
      case "Video": {
        // Notre gabarit n'a pas de bloc vidéo, et `nettoyerBloc` retire
        // les `iframe` : la poser en `html` donnerait un bloc VIDE.
        restes.videos.push(`${slug} : ${(e as { url?: string }).url ?? "(sans url)"}`);
        return;
      }
      case "Section":
      case "Row":
      case "Column":
        break;
      default:
        restes.perdus.set(String(e.type), (restes.perdus.get(String(e.type)) ?? 0) + 1);
        break;
    }
    for (const c of e.childIds ?? []) marcher(c);
  };

  for (const c of racine.childIds ?? []) marcher(c);
  return out;
}

// ── LA FUSION ────────────────────────────────────────────────────────

const nuTexte = (b: Bloc | undefined): string =>
  texteNu(b?.type === "titre" || b?.type === "cta" ? b.texte : (b as { html?: string })?.html);

/**
 * Une signature TOLÉRANTE.
 *
 * Les corrections ont changé des prix, des liens et de la ponctuation :
 * une comparaison exacte verrait un bloc corrigé comme un bloc nouveau,
 * et l'insérerait EN DOUBLE avec sa version d'avant correction.
 *
 * Les images et les FAQ s'apparient par leur RANG. Leur `src` a changé
 * (CDN de Systeme.io contre fichier local, et 22 des 62 images ont été
 * RENOMMÉES au rapatriement) et leur texte a été corrigé : le rang est
 * la seule chose qui n'a pas bougé.
 */
export function signature(b: Bloc, rangs: { img: number; faq: number }): string {
  if (b.type === "image") return `img#${rangs.img}`;
  if (b.type === "faq") return `faq#${rangs.faq}`;
  const n = nuTexte(b)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[0-9]+/g, " ")
    .replace(/[^a-z ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return `${b.type}|${n.slice(0, 80)}`;
}

export function signatures(blocs: readonly Bloc[]): string[] {
  const rangs = { img: 0, faq: 0 };
  return blocs.map((b) => {
    if (b.type === "image") rangs.img += 1;
    if (b.type === "faq") rangs.faq += 1;
    return signature(b, rangs);
  });
}

/** La plus longue sous-séquence commune, en paires d'index. */
export function sousSequence(a: readonly string[], b: readonly string[]): [number, number][] {
  const n = a.length;
  const m = b.length;
  const d = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      d[i][j] = a[i] === b[j] ? d[i + 1][j + 1] + 1 : Math.max(d[i + 1][j], d[i][j + 1]);
    }
  }
  const paires: [number, number][] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      paires.push([i, j]);
      i += 1;
      j += 1;
    } else if (d[i + 1][j] >= d[i][j + 1]) i += 1;
    else j += 1;
  }
  return paires;
}

const mots = (b: Bloc): Set<string> =>
  new Set(
    nuTexte(b)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/https?:\/\/\S+/g, " ")
      .replace(/[^a-z ]+/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2),
  );

/** Deux blocs qui parlent de la même chose, à une correction près. */
export function proximite(a: Bloc, b: Bloc): number {
  const A = mots(a);
  const B = mots(b);
  if (!A.size || !B.size) return 0;
  let commun = 0;
  for (const w of A) if (B.has(w)) commun += 1;
  return commun / (A.size + B.size - commun);
}

/**
 * LE SEUIL NE TRANCHE RIEN À LA LIMITE, IL CONSTATE UN ÉCART.
 *
 * Mesuré le 8 septembre sur les 22 blocs non appariés : les vraies
 * nouveautés sortent entre 0,00 et 0,12, les blocs simplement corrigés
 * (un lien réécrit, un prix corrigé) entre 0,89 et 0,97.
 */
export const PROCHE = 0.5;

export interface Fusion {
  blocs: Bloc[];
  /** Les blocs de la source déjà présents, à une correction près. */
  retrouves: string[];
  /** Les doublons de la source, écartés. */
  doublons: string[];
}

/**
 * FUSIONNE, ET LA FUSION NE PEUT QU'AJOUTER.
 *
 * C'est la décision qui tient tout le chantier, et elle a été prise sur
 * une mesure. Un ré-import franc remplacerait les blocs existants, et il
 * coûterait trois choses invisibles : les images (chemins de CDN, dont
 * 22 renommées), les 62 textes alternatifs (posés à partir du chemin
 * LOCAL, donc perdus avec lui) et toutes les corrections de faits.
 *
 * Donc : les blocs du disque sont RECONDUITS TELS QUELS, dans leur
 * ordre, et seuls les blocs que la source a en plus sont insérés.
 */
export function fusionner(anciens: readonly Bloc[], nouveaux: readonly Bloc[]): Fusion {
  for (const t of ["image", "faq"] as const) {
    const a = anciens.filter((b) => b.type === t).length;
    const n = nouveaux.filter((b) => b.type === t).length;
    if (a !== n) {
      throw new Error(
        `${a} blocs "${t}" sur le disque et ${n} a la source. ` +
          `Ces blocs s'apparient par leur RANG : un ecart les decalerait tous.`,
      );
    }
  }

  const paires = sousSequence(signatures(anciens), signatures(nouveaux));
  const ancApparie = new Set(paires.map(([i]) => i));
  const nouvApparie = new Set(paires.map(([, j]) => j));

  // UN BLOC "NOUVEAU" QUI RESSEMBLE À UN BLOC DU DISQUE EST LE MÊME,
  // corrigé depuis. L'insérer donnerait le paragraphe en double, avec
  // le lien mort ou le prix périmé que la correction avait retiré.
  const orphelins = anciens.map((b, i) => [i, b] as const).filter(([i]) => !ancApparie.has(i));
  const aInserer = new Set<number>();
  const retrouves: string[] = [];
  for (let j = 0; j < nouveaux.length; j++) {
    if (nouvApparie.has(j)) continue;
    let meilleur = 0;
    let qui = -1;
    for (const [i, a] of orphelins) {
      const s = proximite(a, nouveaux[j]);
      if (s > meilleur) {
        meilleur = s;
        qui = i;
      }
    }
    if (meilleur >= PROCHE) retrouves.push(`nouv[${j}] ~ disque[${qui}] (${meilleur.toFixed(2)})`);
    else aInserer.add(j);
  }

  // ON N'INSÈRE PAS DEUX FOIS LE MÊME BLOC. Sa page porte deux fois la
  // même liste à puces (mesuré) : un doublon n'est pas du contenu, et
  // le laisser passer refabriquerait le défaut qu'on répare.
  //
  // LA LISTE EST AMORCÉE AVEC CE QUI EST DÉJÀ SUR LE DISQUE, et c'est
  // ce qui fait converger l'import et la réparation. Sans ça les deux
  // se battent : `blog:reparer` retire le doublon, l'import suivant le
  // remet, et rien n'atteint jamais un état stable. La sous-séquence
  // n'apparie qu'UNE des deux copies ; la seconde ressort en
  // "nouveauté" et il faut la reconnaître ici.
  const dejaVu = new Set<string>(signatures(anciens));
  const doublons: string[] = [];
  for (const j of [...aInserer].sort((x, y) => x - y)) {
    const cle = signature(nouveaux[j], { img: 0, faq: 0 });
    if (dejaVu.has(cle) && nuTexte(nouveaux[j]).length > 40) {
      aInserer.delete(j);
      doublons.push(`nouv[${j}]`);
    }
    dejaVu.add(cle);
  }

  const blocs: Bloc[] = [];
  let oi = 0;
  let nj = 0;
  const glisser = (jusquA: number): void => {
    while (nj < jusquA) {
      if (aInserer.has(nj)) blocs.push(nouveaux[nj]);
      nj += 1;
    }
  };
  for (const [i, j] of paires) {
    const orphelinsIci: number[] = [];
    while (oi < i) {
      orphelinsIci.push(oi);
      blocs.push(anciens[oi]);
      oi += 1;
    }
    const nouveautesIci: number[] = [];
    for (let k = nj; k < j; k++) if (aInserer.has(k)) nouveautesIci.push(k);
    // UNE AMBIGUÏTÉ SE REFUSE, ELLE NE SE TRANCHE PAS AU HASARD. Si un
    // trou porte à la fois un bloc du disque sans jumeau ET une
    // nouveauté, rien ne dit lequel vient avant l'autre.
    if (orphelinsIci.length && nouveautesIci.length) {
      throw new Error(
        `entre deux ancres, le disque a ${orphelinsIci.length} bloc(s) sans jumeau et la source ` +
          `${nouveautesIci.length} nouveaute(s). L'ordre est ambigu, a regarder a la main.`,
      );
    }
    glisser(j);
    blocs.push(anciens[i]);
    oi = i + 1;
    nj = j + 1;
  }
  while (oi < anciens.length) blocs.push(anciens[oi++]);
  glisser(nouveaux.length);

  // LA FUSION NE PEUT QU'AJOUTER : on le VÉRIFIE, on ne le suppose pas.
  let attendu = 0;
  for (const b of blocs) if (b === anciens[attendu]) attendu += 1;
  if (attendu !== anciens.length) {
    throw new Error(`la fusion ne contient plus les ${anciens.length} blocs du disque, dans l'ordre`);
  }

  return { blocs, retrouves, doublons };
}
