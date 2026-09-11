// lib/embed/fluxGeneration.ts
//
// LE QUIZ S'AFFICHE PENDANT QU'IL S'ÉCRIT (chantier 3, 10 septembre 2026).
//
// Béné : "le streaming de la génération, c'est le chantier qui rapporte
// le plus". Jusqu'ici la route appelait Anthropic SANS `stream: true`,
// attendait la réponse entière (30 à 90 s), puis rendait tout d'un coup.
// Le visiteur regardait un spinner pendant tout ce temps, et un spinner
// d'une minute se lit "c'est cassé".
//
// Ce module est PUR (aucun import de `supabaseAdmin`, aucun réseau) :
// c'est ce qui le rend chargeable par le runner natif, donc testé, et
// c'est là que vivent les deux décisions du chantier.
//
// 1. `LecteurSseAnthropic` lit le flux d'Anthropic morceau par morceau
//    (un morceau réseau coupe n'importe où, y compris au milieu d'un
//    événement : le lecteur garde le reste pour le morceau suivant).
//
// 2. `progressionDuFlux` lit le JSON EN COURS d'écriture et rend ce qui
//    est déjà COMPLET : le titre, puis chaque question dont l'objet est
//    fermé, puis chaque profil. Jamais une question à moitié écrite :
//    une phrase coupée au milieu d'un mot se lit comme une panne.
//
// -- POURQUOI ON RELIT TOUT LE TEXTE À CHAQUE MORCEAU --------------------
//
// Une fonction PURE sur le texte accumulé se teste avec une chaîne, sans
// rejouer une séquence de deltas. Et le coût est MESURÉ, pas supposé
// (10 septembre 2026, Node 22) : un quiz de 10 questions et 5 profils
// fait 17,9 Ko ; relu tous les 50 caractères, ça fait 358 lectures pour
// 172 ms de processeur en tout, 0,48 ms par lecture. Un lecteur
// incrémental serait plus rapide et plus difficile à prouver juste,
// pour un gain que personne ne verra.
//
// -- CE QUI PART À L'ÉCRAN EST DU TEXTE, JAMAIS DU HTML ----------------
//
// L'aperçu ne porte que des chaînes, rendues par React en noeuds de
// texte. Et elles passent par `sanitizeAiText` : la règle du 7 juin
// (aucun tiret cadratin vu par un humain) vaut aussi pour les dix
// secondes où une question s'affiche avant que le quiz final, lui,
// soit passé par `sanitizeAiQuizPayload`.

import { sanitizeAiText } from "@/lib/aiTextSanitizer";
import { applyFrenchTypography } from "@/lib/frenchTypography";

/**
 * Un texte d'aperçu, propre : sans tic d'IA, et avec l'espace insécable
 * devant `?`, `!`, `:` et `;` quand le quiz est en français. Le quiz
 * FINAL passe par les mêmes règles plus tard ; l'aperçu ne doit pas
 * montrer pendant dix secondes ce que la page corrigera ensuite.
 */
function texteApercu(brut: string, locale: string | null): string {
  return applyFrenchTypography(sanitizeAiText(brut), locale);
}

// ─────────────────────────────────────────────────────────────────────
// 1. Le flux d'Anthropic, événement par événement
// ─────────────────────────────────────────────────────────────────────

export type EvenementAnthropic =
  /** `message_start` : le modèle qui écrit, et ce que le prompt a coûté. */
  | { type: "debut"; modele: string | null; jetonsEntree: number | null }
  /** `content_block_delta` de type `text_delta`. */
  | { type: "texte"; texte: string }
  /** `message_delta` : la raison d'arrêt et le coût de la sortie. */
  | { type: "fin"; stopReason: string | null; jetonsSortie: number | null }
  /** `error` envoyé DANS le flux (surcharge en cours de route). */
  | { type: "erreur"; genre: string | null; message: string | null };

/** Un bloc SSE (`event: x\ndata: {...}`) découpé en ses deux champs. */
export function lireBlocSse(bloc: string): { event: string; data: string } | null {
  let event = "";
  const data: string[] = [];
  for (const ligne of bloc.split("\n")) {
    if (ligne.startsWith("event:")) event = ligne.slice(6).trim();
    else if (ligne.startsWith("data:")) data.push(ligne.slice(5).replace(/^ /, ""));
  }
  if (!event && data.length === 0) return null;
  return { event, data: data.join("\n") };
}

function entierOuNull(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

function chaineOuNull(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

/**
 * Traduit UN bloc SSE d'Anthropic en événement typé, `null` pour ceux
 * qui ne nous concernent pas (`ping`, `content_block_start`...).
 * Une donnée illisible rend `null` aussi : un bloc corrompu ne doit pas
 * faire tomber le flux entier, le suivant peut très bien être bon.
 */
export function evenementAnthropic(bloc: string): EvenementAnthropic | null {
  const lu = lireBlocSse(bloc);
  if (!lu || !lu.data) return null;
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(lu.data) as Record<string, unknown>;
  } catch {
    return null;
  }
  // Le champ `type` du JSON fait foi ; `event:` le répète, mais c'est
  // la donnée qui est documentée, pas l'en-tête.
  const type = typeof json.type === "string" ? json.type : lu.event;
  if (type === "message_start") {
    const message = (json.message ?? {}) as Record<string, unknown>;
    const usage = (message.usage ?? {}) as Record<string, unknown>;
    return {
      type: "debut",
      modele: chaineOuNull(message.model),
      jetonsEntree: entierOuNull(usage.input_tokens),
    };
  }
  if (type === "content_block_delta") {
    const delta = (json.delta ?? {}) as Record<string, unknown>;
    if (delta.type === "text_delta" && typeof delta.text === "string") {
      return { type: "texte", texte: delta.text };
    }
    return null;
  }
  if (type === "message_delta") {
    const delta = (json.delta ?? {}) as Record<string, unknown>;
    const usage = (json.usage ?? {}) as Record<string, unknown>;
    return {
      type: "fin",
      stopReason: chaineOuNull(delta.stop_reason),
      jetonsSortie: entierOuNull(usage.output_tokens),
    };
  }
  if (type === "error") {
    const err = (json.error ?? {}) as Record<string, unknown>;
    return { type: "erreur", genre: chaineOuNull(err.type), message: chaineOuNull(err.message) };
  }
  return null;
}

/**
 * Le lecteur qui survit aux coupures de morceaux.
 *
 * Un `ReadableStream` rend des octets découpés par le réseau, pas par
 * les événements : un bloc peut arriver en trois fois. On ne traite que
 * ce qui est terminé par une ligne vide, et on garde le reste.
 */
export class LecteurSseAnthropic {
  private reste = "";

  alimenter(morceau: string): EvenementAnthropic[] {
    this.reste += morceau.replace(/\r\n/g, "\n");
    const sortie: EvenementAnthropic[] = [];
    let coupe = this.reste.indexOf("\n\n");
    while (coupe !== -1) {
      const bloc = this.reste.slice(0, coupe);
      this.reste = this.reste.slice(coupe + 2);
      const ev = evenementAnthropic(bloc);
      if (ev) sortie.push(ev);
      coupe = this.reste.indexOf("\n\n");
    }
    return sortie;
  }

  /** Ce que le flux a laissé sans ligne vide finale, à la fermeture. */
  terminer(): EvenementAnthropic[] {
    const bloc = this.reste;
    this.reste = "";
    if (!bloc.trim()) return [];
    const ev = evenementAnthropic(bloc);
    return ev ? [ev] : [];
  }
}

// ─────────────────────────────────────────────────────────────────────
// 2. Ce qui est déjà COMPLET dans le JSON en cours d'écriture
// ─────────────────────────────────────────────────────────────────────

export type QuestionApercu = { texte: string; options: string[] };

export type Progression = {
  titre: string | null;
  questions: QuestionApercu[];
  resultats: string[];
};

export const PROGRESSION_VIDE: Progression = { titre: null, questions: [], resultats: [] };

type Jeton =
  | { t: "{" | "}" | "[" | "]" | ":" | ","; pos: number }
  | { t: "s"; pos: number; fin: number; val: string };

/**
 * Découpe le JSON en jetons, en s'arrêtant proprement sur une chaîne
 * encore ouverte (c'est le cas normal : le modèle est en train de
 * l'écrire). Les nombres, booléens et `null` sont ignorés : on n'a
 * besoin que de la STRUCTURE et des chaînes.
 */
function jetons(texte: string): Jeton[] {
  const out: Jeton[] = [];
  let i = 0;
  const n = texte.length;
  while (i < n) {
    const c = texte[i];
    if (c === '"') {
      let j = i + 1;
      let brut = "";
      let ferme = false;
      while (j < n) {
        const d = texte[j];
        if (d === "\\") {
          if (j + 1 >= n) break;
          brut += d + texte[j + 1];
          j += 2;
          continue;
        }
        if (d === '"') {
          ferme = true;
          break;
        }
        brut += d;
        j += 1;
      }
      if (!ferme) break;
      let val = brut;
      try {
        val = JSON.parse(`"${brut}"`) as string;
      } catch {
        // Une séquence d'échappement que JSON refuse : on garde le brut,
        // l'aperçu ne sert qu'à lire.
      }
      out.push({ t: "s", pos: i, fin: j, val });
      i = j + 1;
      continue;
    }
    if (c === "{" || c === "}" || c === "[" || c === "]" || c === ":" || c === ",") {
      out.push({ t: c, pos: i });
    }
    i += 1;
  }
  return out;
}

function texteDeQuestion(obj: Record<string, unknown>, locale: string | null): QuestionApercu | null {
  const brut = typeof obj.question_text === "string" ? obj.question_text : obj.text;
  if (typeof brut !== "string" || !brut.trim()) return null;
  const options = Array.isArray(obj.options)
    ? (obj.options as unknown[])
        .map((o) =>
          typeof o === "string"
            ? o
            : o && typeof o === "object" && typeof (o as Record<string, unknown>).text === "string"
              ? ((o as Record<string, unknown>).text as string)
              : "",
        )
        .map((s) => texteApercu(s, locale))
        .filter((s) => s.length > 0)
    : [];
  return { texte: texteApercu(brut, locale), options };
}

function titreDeResultat(obj: Record<string, unknown>, locale: string | null): string | null {
  if (typeof obj.title !== "string" || !obj.title.trim()) return null;
  return texteApercu(obj.title, locale) || null;
}

/**
 * Ce que le texte accumulé porte déjà de COMPLET.
 *
 * Le titre dès que sa chaîne est fermée ; une question ou un profil dès
 * que l'objet qui le porte est fermé (`}` au niveau du tableau). L'ordre
 * de sortie est l'ordre d'écriture, donc l'ordre du quiz. `locale` est
 * celle du QUIZ (pas de l'interface) : c'est elle qui décide de la
 * typographie française, et elle est obligatoire pour qu'on ne la
 * devine jamais.
 *
 * Fail-soft partout : un texte qui ne commence pas par `{`, un objet
 * que JSON refuse, une clé inattendue : on rend ce qu'on a pu lire, et
 * jamais une exception. Ce module ne SAUVE pas le quiz (la route
 * relit le JSON entier à la fin), il l'AFFICHE.
 */
export function progressionDuFlux(brut: string, locale: string | null): Progression {
  const depart = brut.indexOf("{");
  if (depart === -1) return { ...PROGRESSION_VIDE, questions: [], resultats: [] };
  const texte = brut.slice(depart);
  const js = jetons(texte);

  const sortie: Progression = { titre: null, questions: [], resultats: [] };
  let profondeur = 0;
  // La clé lue au niveau 1 (dans l'objet racine), en attente de sa valeur.
  let cleRacine: string | null = null;
  // Le tableau qu'on est en train de lire (questions ou results).
  let tableau: "questions" | "results" | null = null;
  let profondeurTableau = 0;
  let debutObjet = -1;

  for (let k = 0; k < js.length; k++) {
    const j = js[k];
    if (j.t === "s") {
      const suivant = js[k + 1];
      if (profondeur === 1 && suivant && suivant.t === ":") {
        cleRacine = j.val;
        continue;
      }
      if (profondeur === 1 && cleRacine === "title" && js[k - 1]?.t === ":") {
        sortie.titre = texteApercu(j.val, locale) || null;
        cleRacine = null;
      }
      continue;
    }
    if (j.t === "{" || j.t === "[") {
      profondeur += 1;
      if (j.t === "[" && profondeur === 2 && (cleRacine === "questions" || cleRacine === "results")) {
        tableau = cleRacine;
        profondeurTableau = profondeur;
        cleRacine = null;
      } else if (tableau && j.t === "{" && profondeur === profondeurTableau + 1) {
        debutObjet = j.pos;
      }
      continue;
    }
    if (j.t === "}" || j.t === "]") {
      if (tableau && j.t === "}" && profondeur === profondeurTableau + 1 && debutObjet !== -1) {
        const morceau = texte.slice(debutObjet, j.pos + 1);
        debutObjet = -1;
        try {
          const obj = JSON.parse(morceau) as Record<string, unknown>;
          if (tableau === "questions") {
            const q = texteDeQuestion(obj, locale);
            if (q) sortie.questions.push(q);
          } else {
            const r = titreDeResultat(obj, locale);
            if (r) sortie.resultats.push(r);
          }
        } catch {
          // Un objet que JSON refuse à ce stade : on ne l'affiche pas,
          // la route dira "illisible" à la fin si ça ne s'arrange pas.
        }
      }
      profondeur -= 1;
      if (tableau && profondeur < profondeurTableau) tableau = null;
      if (profondeur < 0) break;
      continue;
    }
    // `:` et `,` : rien à faire, la clé attend sa valeur.
  }
  return sortie;
}

// ─────────────────────────────────────────────────────────────────────
// 3. Ce qui est NOUVEAU depuis la dernière lecture
// ─────────────────────────────────────────────────────────────────────

export type EvenementApercu =
  | { type: "titre"; titre: string }
  | { type: "question"; index: number; texte: string; options: string[] }
  | { type: "resultat"; index: number; titre: string };

/**
 * Les événements à envoyer au navigateur pour passer d'`avant` à
 * `apres`. Un titre ne part qu'une fois ; une question ou un profil
 * part par son INDEX, dans l'ordre : le client n'a rien à trier.
 */
export function nouveautes(avant: Progression, apres: Progression): EvenementApercu[] {
  const out: EvenementApercu[] = [];
  if (apres.titre && !avant.titre) out.push({ type: "titre", titre: apres.titre });
  for (let i = avant.questions.length; i < apres.questions.length; i++) {
    const q = apres.questions[i];
    out.push({ type: "question", index: i, texte: q.texte, options: q.options });
  }
  for (let i = avant.resultats.length; i < apres.resultats.length; i++) {
    out.push({ type: "resultat", index: i, titre: apres.resultats[i] });
  }
  return out;
}
