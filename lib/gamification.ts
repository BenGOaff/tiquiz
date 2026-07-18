// lib/gamification.ts
// Badges = jalons reels du parcours, pas des points gadget. Chaque badge
// marque un accomplissement concret (un cap franchi), il se debloque tout
// seul a la completion. Module partage (serveur + client) : data pure +
// fonction pure, aucune dependance serveur ici.

export type BadgeRule =
  | { type: "day"; day: number } // ce jour du parcours est termine
  | { type: "parcours_complete" } // tous les jours du parcours sont termines
  | { type: "any_bonus" } // au moins un bonus est termine
  | { type: "metric"; kind: "leads"; threshold: number }; // vrais chiffres Tiquiz

export interface BadgeDef {
  code: string;
  label: string;
  description: string;
  /** Cle d'icone, mappee vers lucide cote rendu. */
  icon:
    | "rocket"
    | "plug"
    | "trophy"
    | "users"
    | "graduation"
    | "compass"
    | "sprout"
    | "flame"
    | "trending";
  rule: BadgeRule;
}

/** Chiffres reels (Tiquiz) utilises pour les badges de resultat. */
export interface MetricSnapshot {
  leads: number;
}

// Curates : un jalon par phase cle, pas un badge par jour (sinon ca dilue).
export const BADGES: BadgeDef[] = [
  {
    code: "demarrage",
    label: "Sur les rails",
    description: "Tu as bouclé ton premier jour. Le plus dur, c'est de commencer.",
    icon: "rocket",
    rule: { type: "day", day: 0 },
  },
  {
    code: "tuyauterie",
    label: "Tuyauterie prête",
    description: "Systeme.io est branché, tes futurs leads ont où atterrir.",
    icon: "plug",
    rule: { type: "day", day: 2 },
  },
  {
    code: "quiz_published",
    label: "Quiz publié",
    description: "Ton quiz est en ligne et capture des leads en automatique. Le gros morceau.",
    icon: "trophy",
    rule: { type: "day", day: 4 },
  },
  {
    code: "communaute",
    label: "Communauté lancée",
    description: "Tes leads deviennent une audience qui revient.",
    icon: "users",
    rule: { type: "day", day: 6 },
  },
  {
    code: "diplome",
    label: "Diplômé L'Atelier du Quiz",
    description: "Parcours terminé. Tu as construit un actif qui tourne.",
    icon: "graduation",
    rule: { type: "parcours_complete" },
  },
  {
    code: "explorateur",
    label: "Explorateur",
    description: "Tu es allé piocher dans les bonus. La curiosité paie.",
    icon: "compass",
    rule: { type: "any_bonus" },
  },
  // Badges de resultat : bases sur tes vrais chiffres Tiquiz (connecte
  // ton compte pour les debloquer).
  {
    code: "first_lead",
    label: "Premier lead",
    description: "Ton quiz a capté son tout premier lead. Ça commence pour de vrai.",
    icon: "sprout",
    rule: { type: "metric", kind: "leads", threshold: 1 },
  },
  {
    code: "leads_10",
    label: "10 leads",
    description: "10 leads captés par ton quiz. La machine tourne.",
    icon: "flame",
    rule: { type: "metric", kind: "leads", threshold: 10 },
  },
  {
    code: "leads_50",
    label: "50 leads",
    description: "50 leads. Tu as un vrai actif d'acquisition entre les mains.",
    icon: "trending",
    rule: { type: "metric", kind: "leads", threshold: 50 },
  },
];

export interface ProgressSnapshot {
  /** day_number des jours du parcours (is_bonus=false) termines. */
  completedParcoursDays: number[];
  /** Nombre total de jours du parcours publies. */
  totalParcoursDays: number;
  /** Nombre de bonus termines. */
  completedBonusCount: number;
}

/**
 * Codes des badges merites pour un etat de progression donne. Les badges
 * de resultat (regle "metric") ne se calculent que si `metrics` est fourni
 * (compte Tiquiz connecte).
 */
export function earnedBadgeCodes(s: ProgressSnapshot, metrics?: MetricSnapshot): string[] {
  const codes: string[] = [];
  for (const b of BADGES) {
    const r = b.rule;
    if (r.type === "day" && s.completedParcoursDays.includes(r.day)) {
      codes.push(b.code);
    } else if (
      r.type === "parcours_complete" &&
      s.totalParcoursDays > 0 &&
      s.completedParcoursDays.length >= s.totalParcoursDays
    ) {
      codes.push(b.code);
    } else if (r.type === "any_bonus" && s.completedBonusCount > 0) {
      codes.push(b.code);
    } else if (
      r.type === "metric" &&
      metrics &&
      r.kind === "leads" &&
      metrics.leads >= r.threshold
    ) {
      codes.push(b.code);
    }
  }
  return codes;
}

export function badgeByCode(code: string): BadgeDef | undefined {
  return BADGES.find((b) => b.code === code);
}
