// lib/insights/tiquizInsights.ts
// Chantier A : transforme les VRAIS chiffres Tiquiz en recommandations
// actionnables. Logique pure (reutilisable serveur + client).
//
// Regle d'or (exigence Béné) : FIABLE avant tout. On ne sort un insight
// que si le volume est suffisant ET qu'il y a une fuite claire. Sinon on
// se tait (ou on guide vers la diffusion). Jamais de chiffres bruts pour
// faire joli : chaque insight = un constat + UNE action concrete.
import type { TiquizMetrics } from "@/lib/types";

export type InsightTone = "alerte" | "conseil" | "bravo" | "info";

export interface TiquizInsight {
  id: string;
  tone: InsightTone;
  title: string;
  action: string;
  /** Jour du parcours a (re)consulter pour appliquer l'action. */
  dayNumber?: number;
}

// Seuils de fiabilite : en dessous, on ne juge pas (trop peu de donnees).
const MIN_VIEWS_TO_ANALYZE = 20;
const MIN_VIEWS_FOR_HOOK = 40;
const MIN_COMPLETES_FOR_CAPTURE = 15;
const MIN_LEADS_FOR_VIRALITY = 20;
const MIN_LEADS_FOR_SCALE = 10;

function pct(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

function n(v: number | undefined | null): number {
  const x = Number(v);
  return Number.isFinite(x) && x > 0 ? Math.floor(x) : 0;
}

/**
 * Recommandations, classees par priorite. Renvoie au plus 2 insights
 * (on ne noie pas l'eleve). Tableau vide = compte non connecte (gere
 * ailleurs par le panneau de connexion).
 */
export function computeTiquizInsights(metrics: TiquizMetrics | null): TiquizInsight[] {
  if (!metrics) return [];

  const views = n(metrics.views);
  const completes = n(metrics.completes);
  const leads = n(metrics.leads);
  const shares = n(metrics.shares);

  // Trop peu de trafic : on NE juge PAS les reglages, on guide vers la diffusion.
  if (views < MIN_VIEWS_TO_ANALYZE) {
    return [
      {
        id: "trafic",
        tone: "info",
        title:
          views === 0
            ? "Ton quiz n'a pas encore de visiteurs."
            : "Pas encore assez de visiteurs pour analyser tes réglages.",
        action:
          "On se concentre sur la diffusion : lien en bio, signature email, et surtout la page de remerciement de ton freebie actuel.",
        dayNumber: 5,
      },
    ];
  }

  const insights: TiquizInsight[] = [];

  // 1. Capture (le signal le plus fiable et le plus rentable).
  if (completes >= MIN_COMPLETES_FOR_CAPTURE) {
    const leadRate = leads / completes;
    if (leadRate < 0.5) {
      insights.push({
        id: "capture",
        tone: "alerte",
        title: `Beaucoup finissent ton quiz, mais peu laissent leur email (${pct(leadRate)}).`,
        action:
          "Ta capture est sûrement placée après le résultat. Mets le formulaire email JUSTE avant le résultat : c'est le réglage qui fait le plus bouger tes leads.",
        dayNumber: 4,
      });
    }
  }

  // 2. Accroche faible : beaucoup de vues, peu vont au bout.
  if (views >= MIN_VIEWS_FOR_HOOK) {
    const completionRate = completes / views;
    if (completionRate < 0.2) {
      insights.push({
        id: "accroche",
        tone: "alerte",
        title: `Beaucoup de visiteurs, mais peu vont au bout (${pct(completionRate)} terminent).`,
        action:
          "Rends ta première question plus légère et intrigante (jamais l'email en premier), et raccourcis si tu dépasses 8 questions.",
        dayNumber: 4,
      });
    }
  }

  // 3. Pas de viralite : des leads, mais quasi aucun partage.
  if (leads >= MIN_LEADS_FOR_VIRALITY && insights.length < 2) {
    const shareRate = completes > 0 ? shares / completes : 0;
    if (shareRate < 0.05) {
      insights.push({
        id: "viralite",
        tone: "conseil",
        title: "Tu captes des leads, mais presque personne ne partage.",
        action:
          "Tu laisses de la croissance gratuite de côté. Active le bonus de partage et donne à chaque résultat un nom qu'on a envie d'afficher.",
        dayNumber: 5,
      });
    }
  }

  // 4. Rien a corriger : on felicite ET on pousse a passer a l'echelle.
  if (insights.length === 0) {
    if (leads >= MIN_LEADS_FOR_SCALE) {
      insights.push({
        id: "scale",
        tone: "bravo",
        title: `Ton quiz convertit bien (${leads} leads captés).`,
        action:
          "Le réglage est bon. Maintenant, mets plus de monde dedans : relance la diffusion, ou explore la pub auto-liquidante (bonus).",
        dayNumber: 5,
      });
    } else {
      insights.push({
        id: "ok",
        tone: "info",
        title: "Rien à corriger côté réglages pour l'instant.",
        action:
          "Ton quiz tourne. Continue à le diffuser pour accumuler du volume et faire grimper tes leads.",
        dayNumber: 5,
      });
    }
  }

  return insights.slice(0, 2);
}
