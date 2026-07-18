// lib/coach/knowledge.ts
// Construit la base de connaissance et le prompt systeme du coach IA, a
// partir du contenu LIVE des jours (table days) + le contexte de l'eleve.
// Pas de RAG : on borne le contexte (index de tous les jours + le jour
// courant en entier) pour maitriser le cout et l'hallucination.
import "server-only";
import {
  ACTIVITY_OPTIONS,
  MATURITY_OPTIONS,
  MONETIZATION_OPTIONS,
  ADS_OPTIONS,
  labelOf,
} from "@/lib/businessProfile";

export interface CoachDay {
  day_number: number;
  title: string;
  subtitle: string | null;
  intro_html: string | null;
}

export interface CoachAnswer {
  prompt: string;
  value: string;
}

/** Un jour du carnet de bord (reponses de l'eleve), pour le coach. */
export interface CoachCarnetDay {
  dayNumber: number;
  title: string;
  isBonus: boolean;
  entries: { prompt: string; answer: string }[];
}

/** Avancement de l'eleve dans le parcours, pour le coach. */
export interface CoachProgress {
  completedParcoursDays: number[];
  totalParcoursDays: number;
  /** Prochain jour du parcours a faire (debloque, non complete), ou null si fini. */
  activeDayNumber: number | null;
  completedBonusCount: number;
}

export interface CoachDoc {
  title: string;
  content: string;
}

/** Le quiz Tiquiz de l'eleve, pour que le coach aide a l'ameliorer. */
export interface CoachQuizContext {
  title: string;
  status: string;
  issues: { title: string; fix: string }[];
  profiles: { title: string; hasCta: boolean }[];
}

/** Budget de caracteres pour les documents de connaissance injectes. */
const DOCS_CHAR_BUDGET = 14000;
/** Budget de caracteres pour le carnet de bord injecte (borne le cout). */
const CARNET_CHAR_BUDGET = 4500;

/** Retire les balises HTML et normalise les espaces. */
export function htmlToText(html: string | null): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|h2|h3|li|ul|ol)>/gi, "\n")
    .replace(/<li>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\[\[figure:[a-z0-9-]+\]\]/gi, "")
    .replace(/\[\[video:\d+\]\]/gi, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function clip(s: string, max: number): string {
  return s.length > max ? s.slice(0, max).trimEnd() + "..." : s;
}

// Instruction par defaut (utilisee si l'admin n'en a pas defini une).
// Pas de tiret long : on nomme les caracteres au lieu de les ecrire.
const SYSTEM_PERSONA = `Tu es le coach IA de L'Atelier du Quiz, la formation de Béné : lancer un quiz lead-magnet avec Tiquiz en 14 jours. Tu aides l'élève à avancer sur SON projet et à se débloquer.

Style de réponse, très important :
- Va droit au but. Aucune formule d'introduction (pas de "bonne question", pas de "je comprends ton doute"), aucun méta-commentaire. Tu réponds, c'est tout.
- Court : 2 à 4 phrases en général. Si l'élève a besoin d'étapes, donne une vraie liste plutôt qu'un paragraphe.
- Une seule question à la fois, et seulement si elle fait avancer.
- Mise en forme : mets en gras les mots clés avec des doubles astérisques (par exemple **ton angle**), et utilise des listes à puces (chaque point sur une ligne qui commence par "- ") quand tu énumères. N'écris jamais d'astérisques décoratives ni de titres.

Garde-fous, non négociables :
- Tu réponds UNIQUEMENT à partir du contenu du programme et des documents fournis ci-dessous. Si l'info n'y est pas, dis-le franchement et renvoie vers Béné ou la communauté. Tu n'inventes jamais une méthode, un chiffre, une fonctionnalité ou une URL.
- Tutoiement, ton chaleureux et direct, comme Béné.
- Jamais de promesse de résultat chiffré : on promet un système, pas un million.
- Jamais de tiret long (ni cadratin ni demi-cadratin) : utilise la virgule, les deux-points, les parenthèses ou une nouvelle phrase.
- Tu peux t'appuyer sur les réponses déjà données par l'élève (son carnet) pour personnaliser.`;

// Lien Systeme.io de Béné (affilié, demande du 9 juillet 2026). Injecté
// dans une section dédiée du prompt et PAS dans SYSTEM_PERSONA, pour
// s'appliquer aussi quand l'admin a défini sa propre instruction. Côté
// élève, le coach ne parle jamais d'affiliation à propos de ce lien : il
// dit simplement que le lien donne droit à une formation Systeme.io
// complète, offerte.
const SYSTEME_IO_LINK =
  "https://systeme.io/fr?sa=sa0007878317200141bbe3de2b6644176621db2c6580";

const SYSTEME_IO_LINK_RULES = `

=== LIEN SYSTEME.IO (règle absolue) ===
Quand tu recommandes Systeme.io, ou que l'élève demande où créer son compte, sa page de capture, sa séquence email ou son tunnel, donne TOUJOURS exactement ce lien : ${SYSTEME_IO_LINK}
Tu peux préciser que toutes les personnes qui créent leur compte en passant par ce lien reçoivent une formation complète sur Systeme.io, offerte.
Ne présente jamais ce lien comme un lien d'affiliation et ne parle pas d'affiliation à son sujet (même si le programme aborde l'affiliation par ailleurs). N'utilise jamais un autre lien vers systeme.io que celui-ci.`;

/**
 * Construit le prompt systeme complet : persona + regle lien Systeme.io +
 * index de tous les jours + jour courant en entier + contexte eleve.
 */
export function buildCoachSystemPrompt(input: {
  instruction?: string | null;
  docs?: CoachDoc[];
  days: CoachDay[];
  currentDay: CoachDay | null;
  firstName: string | null;
  niche: string | null;
  activityType: string | null;
  maturity: string | null;
  monetization: string | null;
  adsBudget: string | null;
  currentAnswers: CoachAnswer[];
  progress?: CoachProgress | null;
  carnet?: CoachCarnetDay[];
  quizContext?: CoachQuizContext | null;
}): string {
  const {
    instruction,
    docs,
    days,
    currentDay,
    firstName,
    niche,
    activityType,
    maturity,
    monetization,
    adsBudget,
    currentAnswers,
    progress,
    carnet,
    quizContext,
  } = input;

  const persona = instruction && instruction.trim() ? instruction.trim() : SYSTEM_PERSONA;

  const index = days
    .map((d) => {
      const sub = d.subtitle ? ` (${d.subtitle})` : "";
      return `Jour ${d.day_number} : ${d.title}${sub}\n${clip(htmlToText(d.intro_html), 350)}`;
    })
    .join("\n\n");

  let prompt = `${persona}${SYSTEME_IO_LINK_RULES}\n\n=== PROGRAMME (vue d'ensemble des jours) ===\n${index}`;

  // Documents de connaissance charges par l'admin (bornes en taille).
  if (docs && docs.length) {
    let budget = DOCS_CHAR_BUDGET;
    const parts: string[] = [];
    for (const doc of docs) {
      if (budget <= 0) break;
      const body = clip(doc.content.trim(), budget);
      budget -= body.length;
      parts.push(`# ${doc.title}\n${body}`);
    }
    if (parts.length) {
      prompt += `\n\n=== DOCUMENTS DE RÉFÉRENCE (fournis par Béné) ===\n${parts.join("\n\n")}`;
    }
  }

  if (currentDay) {
    prompt += `\n\n=== JOUR EN COURS : Jour ${currentDay.day_number}, ${currentDay.title} ===\n${htmlToText(currentDay.intro_html)}`;
  }

  const profileBits: string[] = [];
  if (firstName) profileBits.push(`prénom : ${firstName} (adresse-toi à lui par son prénom de temps en temps, naturellement)`);
  if (niche) profileBits.push(`niche : ${niche}`);
  if (activityType) profileBits.push(`activité : ${labelOf(ACTIVITY_OPTIONS, activityType)}`);
  if (maturity) profileBits.push(`maturité business : ${labelOf(MATURITY_OPTIONS, maturity)}`);
  if (monetization) profileBits.push(`monétisation : ${labelOf(MONETIZATION_OPTIONS, monetization)}`);
  if (adsBudget) profileBits.push(`budget pub : ${labelOf(ADS_OPTIONS, adsBudget)}`);
  if (profileBits.length) {
    prompt += `\n\n=== CONTEXTE DE L'ÉLÈVE (adapte tes conseils à SA situation) ===\n${profileBits.join("\n")}`;
    // Adaptations clefs selon le profil.
    if (monetization === "affiliation" || monetization === "les_deux") {
      prompt += `\nNote : il fait de l'affiliation. Oriente le quiz vers la recommandation (le résultat diagnostique le besoin et présente le produit affilié comme solution logique), pas vers la vente d'une offre propre.`;
    }
    if (adsBudget === "non") {
      prompt += `\nNote : pas de budget pub. Priorise les leviers gratuits, ne propose pas d'ads tant que le quiz n'est pas validé en gratuit.`;
    }
  }

  // Avancement dans le parcours : le coach sait OU en est l'eleve pour
  // adapter ses conseils a son niveau (ne pas renvoyer a un jour non atteint,
  // capitaliser sur ce qui est deja fait).
  if (progress && progress.totalParcoursDays > 0) {
    const done = progress.completedParcoursDays.length;
    const where =
      progress.activeDayNumber != null
        ? `Il en est actuellement au Jour ${progress.activeDayNumber} (prochain jour à faire).`
        : done >= progress.totalParcoursDays
          ? `Il a terminé tout le parcours.`
          : `Il n'a pas encore commencé.`;
    const bonusLine =
      progress.completedBonusCount > 0
        ? ` Bonus complétés : ${progress.completedBonusCount}.`
        : "";
    prompt +=
      `\n\n=== OÙ EN EST L'ÉLÈVE (adapte tes conseils à son avancement) ===\n` +
      `Jours du parcours terminés : ${done} sur ${progress.totalParcoursDays}` +
      (done > 0 ? ` (jours ${progress.completedParcoursDays.join(", ")}).` : ".") +
      `\n${where}${bonusLine}` +
      `\nNe le renvoie pas à un jour qu'il n'a pas encore atteint, sauf pour l'y préparer. Appuie-toi sur ce qu'il a déjà fait.`;
  }

  // Carnet de bord complet (borne) : les reponses de l'eleve sur TOUT le
  // parcours, source de verite de son projet. Disponible meme hors des
  // pages jour (ou currentAnswers est vide).
  if (carnet && carnet.length) {
    let budget = CARNET_CHAR_BUDGET;
    const blocks: string[] = [];
    for (const d of carnet) {
      if (budget <= 0) break;
      const lines = d.entries
        .map((e) => `Q: ${e.prompt}\nR: ${clip(e.answer, 200)}`)
        .join("\n");
      const block = `Jour ${d.dayNumber} - ${d.title}\n${lines}`;
      const clipped = clip(block, budget);
      budget -= clipped.length;
      blocks.push(clipped);
    }
    if (blocks.length) {
      prompt += `\n\n=== CARNET DE BORD DE L'ÉLÈVE (ses réponses sur le parcours, source de vérité) ===\n${blocks.join("\n\n")}`;
    }
  }

  // Le quiz Tiquiz de l'eleve : le coach peut l'aider a l'ameliorer (ses
  // questions, ses resultats, ses CTA) a partir de sa vraie structure.
  if (quizContext) {
    const lines: string[] = [
      `Quiz : "${quizContext.title}" (${quizContext.status === "active" ? "publié" : "brouillon"}).`,
    ];
    if (quizContext.profiles.length) {
      lines.push(
        `Profils de résultat : ${quizContext.profiles
          .map((p) => `${p.title}${p.hasCta ? "" : " (sans CTA)"}`)
          .join(", ")}.`,
      );
    }
    if (quizContext.issues.length) {
      lines.push("Points à améliorer détectés :");
      for (const it of quizContext.issues) lines.push(`- ${it.title} ${it.fix}`);
    } else {
      lines.push("Aucun défaut de structure majeur détecté.");
    }
    prompt +=
      `\n\n=== SON QUIZ TIQUIZ (aide-le à l'améliorer si il le demande) ===\n` +
      lines.join("\n") +
      `\nSi l'élève veut améliorer son quiz, ses questions ou ses résultats, appuie-toi sur ces éléments concrets et sur le programme.`;
  }

  // Focus sur le jour en cours (si l'eleve est sur une page jour).
  if (currentAnswers.length) {
    const currentCarnet = currentAnswers
      .map((a) => `Q: ${a.prompt}\nR: ${clip(a.value, 300)}`)
      .join("\n");
    prompt += `\n\n=== RÉPONSES DE L'ÉLÈVE (jour en cours, à prioriser) ===\n${currentCarnet}`;
  }

  return prompt;
}
