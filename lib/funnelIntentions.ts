// lib/funnelIntentions.ts
// Intentions de campagne par profil de resultat. L'eleve peut fixer, pour
// chaque profil de son quiz, l'objectif de l'email (au-dela du CTA reel du
// resultat). Module partage (data pure, utilisable client + serveur).

export const FUNNEL_INTENTIONS = [
  { value: "auto", label: "Automatique (selon le CTA du résultat)" },
  { value: "valeur", label: "Apporter de la valeur" },
  { value: "rassurer", label: "Rassurer, lever les objections" },
  { value: "vendre", label: "Vendre une offre" },
  { value: "rdv", label: "Proposer un rendez-vous" },
  { value: "leadmagnet", label: "Offrir une ressource (lead magnet)" },
] as const;

export type FunnelIntention = (typeof FUNNEL_INTENTIONS)[number]["value"];

export const DEFAULT_INTENTION: FunnelIntention = "auto";

/** Map { titre de profil -> intention } telle que stockee/echangee. */
export type IntentionMap = Record<string, FunnelIntention>;

const VALID = new Set(FUNNEL_INTENTIONS.map((i) => i.value));

export function isIntention(v: unknown): v is FunnelIntention {
  return typeof v === "string" && VALID.has(v as FunnelIntention);
}

export function intentionLabel(v: FunnelIntention): string {
  return FUNNEL_INTENTIONS.find((i) => i.value === v)?.label ?? v;
}

/** Consigne d'ecriture donnee au LLM pour une intention (hors "auto"). */
export function intentionGuidance(v: FunnelIntention): string {
  switch (v) {
    case "valeur":
      return "objectif : apporter de la valeur concrète, sans rien vendre (conseil actionnable).";
    case "rassurer":
      return "objectif : rassurer et lever les objections, installer la confiance.";
    case "vendre":
      return "objectif : vendre l'offre, un seul appel à l'action clair vers l'achat.";
    case "rdv":
      return "objectif : proposer un rendez-vous ou un appel découverte, CTA vers la prise de rendez-vous.";
    case "leadmagnet":
      return "objectif : offrir une ressource gratuite (lead magnet) pour approfondir la relation.";
    default:
      return "";
  }
}

/** Nettoie une map recue : ne garde que les intentions valides. */
export function sanitizeIntentionMap(raw: unknown): IntentionMap {
  if (!raw || typeof raw !== "object") return {};
  const out: IntentionMap = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof key === "string" && key.trim() && isIntention(val)) {
      out[key.trim()] = val;
    }
  }
  return out;
}
