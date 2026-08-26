// lib/leads/exportCsv.ts (Tiquiz)
//
// L'EXPORT DES LEADS, POUR QUELQU'UN QUI N'A PAS SYSTEME.IO.
//
// Béné, 26 août 2026 : "l'export des résultats de tiquiz ne donne ni la
// date ni le détail des réponses, ni le tag enregistré dans systeme io
// (si concerné), en plus de ne pas gérer mes accents. On peut améliorer
// ça pour les personnes qui ont autre chose que systeme io ou veulent
// exploiter leurs résultats autrement ?"
//
// -- LES QUATRE DÉFAUTS, ET LE PREMIER EST UN VRAI BUG -----------------
//
// 1. **LES COLONNES ÉTAIENT DÉCALÉES SUR UN QUIZ SCORÉ.** L'en-tête
//    disait `... Résultat, Date, Scores` et la ligne écrivait
//    `... résultat, SCORES, date`. Le score tombait donc sous "Date" et
//    la date sous "Scores". Personne ne peut voir ça en relisant le
//    code : les deux listes vivaient sur la même ligne, à quatre-vingts
//    caractères d'écart.
// 2. **PAS DE BOM.** Excel lit alors le fichier en Latin-1 et affiche
//    `RÃ©sultat`. Trois octets manquants, et tout le fichier a l'air
//    cassé.
// 3. **AUCUNE RÉPONSE.** Le détail était en base et n'était pas exporté :
//    l'export ne servait qu'à récupérer des adresses.
// 4. **AUCUN TAG.** `sio_tag_applied` existe depuis mars et personne ne
//    le montrait, alors que c'est la seule trace de ce qui est parti
//    chez Systeme.io.
//
// -- POURQUOI CE FICHIER EXISTE ----------------------------------------
//
// L'export tenait en UNE ligne dans `QuizDetailClient.tsx`. Une logique
// enfermée dans un composant React n'est pas testable, donc elle n'est
// pas testée, et c'est exactement là que le décalage de colonnes s'est
// installé. Ici, un test compare l'en-tête et la ligne, colonne par
// colonne : le décalage ne peut plus revenir sans devenir rouge.
//
// -- CE QU'ON NE CHANGE PAS --------------------------------------------
//
// **Le séparateur reste la virgule.** Le tableur de Béné découpe déjà
// correctement ses colonnes : le problème était l'encodage, pas le
// séparateur. Passer au point-virgule "pour Excel français" casserait ce
// qui marche chez elle et chez tous ceux qui importent déjà ce fichier.
//
// **Les cinq premières colonnes gardent leur ordre** (Email, Prénom,
// Nom, Résultat, Date) : quelqu'un qui a déjà une correspondance
// d'import ne doit pas la refaire. Tout ce qui est nouveau vient après.

/** Ce que l'export sait lire d'un lead. Volontairement large : la ligne
 *  vient d'un `select("*")`, et un champ absent n'est pas une erreur. */
export type LeadExportable = {
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  country?: string | null;
  result_title?: string | null;
  scores?: unknown;
  sio_tag_applied?: string | null;
  sio_synced?: boolean | null;
  created_at?: string | null;
  answers?: unknown;
};

/** Les libellés de colonnes, traduits par l'appelant. Le module reste
 *  pur : il ne connaît aucune langue. */
export type LibellesExport = {
  email: string;
  prenom: string;
  nom: string;
  resultat: string;
  date: string;
  telephone: string;
  pays: string;
  scores: string;
  tag: string;
  /** Préfixe des colonnes de réponse : "Q1", "Q2"... suivi du libellé. */
  question: string;
};

/**
 * LE MOMENT DE LA CAPTURE, TRIABLE PARTOUT.
 *
 * `toLocaleDateString()` rendait `26/08/2026` : pas d'heure, et une
 * forme qui change de sens d'un pays à l'autre (un tableur américain lit
 * le 8 juin). `2026-08-26 14:32` se trie comme du texte, se lit
 * partout, et garde l'heure : deux personnes captées le même jour ne
 * sont plus indiscernables.
 */
export function dateExport(iso: string | null | undefined): string {
  const brut = String(iso ?? "").trim();
  if (!brut) return "";
  const d = new Date(brut);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ` +
    `${p(d.getHours())}:${p(d.getMinutes())}`
  );
}

/** Une cellule CSV : guillemets doublés, et jamais de saut de ligne nu
 *  qui casserait la ligne suivante. */
export function cellule(valeur: unknown): string {
  const texte = valeur === null || valeur === undefined ? "" : String(valeur);
  return `"${texte.replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
}

/**
 * Les colonnes du fichier, en-tête et extracteur ENSEMBLE.
 *
 * C'est le coeur de la correction : une colonne est un couple
 * `{ entete, valeur }`, donc l'en-tête et la donnée ne PEUVENT plus se
 * désaligner. L'ancien code tenait deux listes séparées, et elles ont
 * fini par diverger sur les quiz scorés.
 */
export type Colonne = { entete: string; valeur: (l: LeadExportable) => string };

export function colonnesExport(params: {
  libelles: LibellesExport;
  /** Ajoute la colonne des scores. Un PARAMÈTRE, jamais deviné du
   *  contenu : un quiz scoré dont personne n'a encore répondu doit
   *  quand même produire la colonne. */
  scoring: boolean;
  /** Résumé lisible des scores, fourni par l'appelant (il vit déjà
   *  dans `lib/quizScoring.ts`). */
  resumerScores: (scores: unknown) => string;
  /** Les questions vivantes, dans l'ordre, pour une colonne chacune. */
  questions: ReadonlyArray<{ id?: string | null; question_text?: string | null }>;
  /** Rend la réponse d'un lead à la question de cette POSITION. */
  reponse: (lead: LeadExportable, position: number) => string;
  /** Titre de question nettoyé de son HTML, fourni par l'appelant. */
  nettoyer: (html: string) => string;
}): Colonne[] {
  const { libelles: L, questions } = params;
  const colonnes: Colonne[] = [
    { entete: L.email, valeur: (l) => l.email ?? "" },
    { entete: L.prenom, valeur: (l) => l.first_name ?? "" },
    { entete: L.nom, valeur: (l) => l.last_name ?? "" },
    { entete: L.resultat, valeur: (l) => params.nettoyer(l.result_title ?? "") },
    { entete: L.date, valeur: (l) => dateExport(l.created_at) },
    { entete: L.telephone, valeur: (l) => l.phone ?? "" },
    { entete: L.pays, valeur: (l) => l.country ?? "" },
  ];

  if (params.scoring) {
    colonnes.push({ entete: L.scores, valeur: (l) => params.resumerScores(l.scores) });
  }

  // LE TAG SYSTEME.IO. Vide quand rien n'est parti : c'est une
  // information, pas un trou. Quelqu'un qui n'utilise pas Systeme.io
  // voit une colonne vide, et c'est la réponse juste à sa question.
  colonnes.push({ entete: L.tag, valeur: (l) => l.sio_tag_applied ?? "" });

  questions.forEach((q, i) => {
    const titre = params.nettoyer(String(q.question_text ?? "")).trim();
    colonnes.push({
      entete: `${libelleQuestion(L.question, i + 1)}${titre ? ` ${titre}` : ""}`,
      valeur: (l) => params.reponse(l, i),
    });
  });

  return colonnes;
}

function libelleQuestion(prefixe: string, numero: number): string {
  return `${prefixe}${numero}`;
}

/**
 * Le fichier complet, BOM compris.
 *
 * **Le BOM n'est pas un détail** : sans lui, Excel lit l'UTF-8 comme du
 * Latin-1 et affiche `RÃ©sultat`. Trois octets, et tout le fichier a
 * l'air cassé pour quelqu'un qui n'y peut rien.
 */
export const BOM_UTF8 = "﻿";

export function construireCsv(colonnes: Colonne[], leads: ReadonlyArray<LeadExportable>): string {
  const lignes = [
    colonnes.map((c) => cellule(c.entete)).join(","),
    ...leads.map((l) => colonnes.map((c) => cellule(c.valeur(l))).join(",")),
  ];
  return BOM_UTF8 + lignes.join("\r\n");
}
