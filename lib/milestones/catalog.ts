// lib/milestones/catalog.ts (Tiquiz)
//
// Catalogue des milestones rétention Tiquiz (port adapté de Tipote).
// Tiquiz n'a pas de mailer → pas de champs email. Le milestone se
// montre uniquement en toast in-app (title + body + emoji).
//
// Milestones spécifiques Tiquiz : quiz publiés, leads, vues,
// complétions, partages, popquiz. PAS de sales/posts (hors scope).
//
// FR uniquement V1 (locale par défaut). milestoneKey = identifiant
// stable DB, ne jamais renommer.

import type { BusinessEventKind } from "@/lib/businessEvents";

export interface MilestoneCountTrigger {
  type: "count";
  kind: BusinessEventKind;
  threshold: number;
}

export type MilestoneTrigger = MilestoneCountTrigger;

export interface MilestoneDefinition {
  key: string;
  emoji: string;
  title: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  trigger: MilestoneTrigger;
}

export const MILESTONE_CATALOG: MilestoneDefinition[] = [
  // ---- Quiz publiés ----
  {
    key: "first_quiz_published",
    emoji: "🚀",
    title: "Ton premier quiz est en ligne !",
    body: "Partage son lien et regarde les leads arriver. C'est parti.",
    ctaLabel: "Voir mes quiz",
    ctaUrl: "/dashboard",
    trigger: { type: "count", kind: "quiz_published", threshold: 1 },
  },

  // ---- Leads ----
  {
    key: "first_lead",
    emoji: "🎯",
    title: "Ton premier lead capturé !",
    body: "Un visiteur a laissé son email. Tipote l'a tagué dans Systeme.io.",
    ctaLabel: "Voir mes leads",
    ctaUrl: "/leads",
    trigger: { type: "count", kind: "lead_captured", threshold: 1 },
  },
  {
    key: "leads_10",
    emoji: "✨",
    title: "10 leads captés !",
    body: "Ton quiz fait le job. Le palier des 100 n'est plus loin.",
    ctaLabel: "Voir mes leads",
    ctaUrl: "/leads",
    trigger: { type: "count", kind: "lead_captured", threshold: 10 },
  },
  {
    key: "leads_100",
    emoji: "🏆",
    title: "100 leads — ton lead magnet tourne",
    body: "100 prospects taggés. Ta machine à leads est lancée.",
    ctaLabel: "Voir mes leads",
    ctaUrl: "/leads",
    trigger: { type: "count", kind: "lead_captured", threshold: 100 },
  },
  {
    key: "leads_1000",
    emoji: "👑",
    title: "1000 leads — palier de pro",
    body: "C'est rare. Tu as construit une vraie audience avec tes quiz.",
    ctaLabel: "Voir mes leads",
    ctaUrl: "/leads",
    trigger: { type: "count", kind: "lead_captured", threshold: 1000 },
  },

  // ---- Complétions ----
  {
    key: "first_quiz_complete",
    emoji: "✅",
    title: "Premier visiteur qui finit ton quiz",
    body: "Quelqu'un est allé jusqu'au résultat. Bon signe d'engagement.",
    ctaLabel: "Voir mes stats",
    ctaUrl: "/stats",
    trigger: { type: "count", kind: "quiz_complete", threshold: 1 },
  },
  {
    key: "quiz_completes_100",
    emoji: "🎓",
    title: "100 quiz complétés",
    body: "Tes quiz retiennent l'attention jusqu'au bout. 100 fois déjà.",
    ctaLabel: "Voir mes stats",
    ctaUrl: "/stats",
    trigger: { type: "count", kind: "quiz_complete", threshold: 100 },
  },
  {
    key: "quiz_completes_1000",
    emoji: "🏟️",
    title: "1000 quiz complétés",
    body: "Mille visiteurs jusqu'au bout. Ta mécanique scale vraiment.",
    ctaLabel: "Voir mes stats",
    ctaUrl: "/stats",
    trigger: { type: "count", kind: "quiz_complete", threshold: 1000 },
  },

  // ---- Partages ----
  {
    key: "first_quiz_share",
    emoji: "📤",
    title: "Premier partage de ton quiz",
    body: "Un visiteur a partagé son résultat. La viralité démarre.",
    ctaLabel: "Voir mes stats",
    ctaUrl: "/stats",
    trigger: { type: "count", kind: "quiz_share", threshold: 1 },
  },
  {
    key: "quiz_shares_100",
    emoji: "📣",
    title: "100 partages de quiz",
    body: "Tes quiz se propagent tout seuls dans des réseaux que tu ne contrôles pas.",
    ctaLabel: "Voir mes stats",
    ctaUrl: "/stats",
    trigger: { type: "count", kind: "quiz_share", threshold: 100 },
  },

  // ---- Popquiz ----
  {
    key: "first_popquiz_published",
    emoji: "🎬",
    title: "Ton premier Popquiz vidéo est en ligne",
    body: "Vidéo + quiz incrustés. Embed-le sur ton site pour capturer en plein visionnage.",
    ctaLabel: "Voir mes popquiz",
    ctaUrl: "/dashboard",
    trigger: { type: "count", kind: "popquiz_published", threshold: 1 },
  },
];

export function milestonesForKind(kind: BusinessEventKind): MilestoneDefinition[] {
  return MILESTONE_CATALOG.filter((m) => m.trigger.kind === kind).sort(
    (a, b) => a.trigger.threshold - b.trigger.threshold,
  );
}

export function getMilestoneByKey(key: string): MilestoneDefinition | null {
  return MILESTONE_CATALOG.find((m) => m.key === key) ?? null;
}
