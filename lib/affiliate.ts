// lib/affiliate.ts
// Espace Affiliation de l'Atelier du Quiz. Module data-pure (réutilisable
// serveur + client). L'affiliation est NATIVE Systeme.io : on stocke l'ID
// affilié (sa...) et on construit le lien tracké. Le tracking des gains et
// le paiement sont gérés par Systeme.io (source de vérité).
//
// Modèle de commission (configuré côté Systeme.io) :
//   - 70% de commission sur chaque vente de l'Atelier du Quiz (Quizing)
//     (100% au lancement, passé à 70% en juillet 2026)
//   - 40% par mois, en récurrent, sur chaque abonnement Tiquiz parrainé

import { resolvePersona, type Persona } from "@/lib/personas";

// --- Constantes -----------------------------------------------------------

export const QUIZING_COMMISSION_PCT = 70;
export const TIQUIZ_RECURRING_PCT = 40;

/** Page de vente de l'Atelier du Quiz (le lien affilié pointe ici). */
export const ATELIER_SALES_URL = "https://www.tipote.fr/atelier-du-quiz";

/** Où l'affilié trouve son identifiant et règle ses paiements (Systeme.io). */
export const SIO_AFFILIATE_DASHBOARD_URL = "https://systeme.io/dashboard/affiliate-dashboard";
export const SIO_AFFILIATE_SETTINGS_URL = "https://systeme.io/dashboard/profile/affiliate-settings";

// --- Identifiant affilié Systeme.io --------------------------------------

// Format Systeme.io : "sa" suivi d'un hash hexadécimal long.
// Ex : sa0007878317200141bbe3de2b6644176621db2c6580
const SIO_AFFILIATE_ID_RE = /^sa[a-f0-9]{20,80}$/i;

/**
 * Nettoie une saisie : accepte l'ID brut OU un lien complet collé
 * (https://systeme.io/fr?sa=saXXXX) dont on extrait le paramètre sa.
 * Retourne "" si rien d'exploitable.
 */
export function normalizeAffiliateId(raw: string | null | undefined): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  // Lien collé : on extrait ?sa=... ou &sa=...
  const m = s.match(/[?&]sa=([a-z0-9]+)/i);
  const candidate = (m ? m[1] : s).trim();
  return candidate;
}

export function isValidAffiliateId(value: string | null | undefined): boolean {
  return SIO_AFFILIATE_ID_RE.test(String(value ?? "").trim());
}

/** Construit le lien affilié tracké vers la page de vente de l'Atelier du Quiz. */
export function buildAffiliateLink(affiliateId: string): string {
  const sa = String(affiliateId ?? "").trim();
  if (!sa) return "";
  return `${ATELIER_SALES_URL}?sa=${sa}`;
}

// --- Personnalisation : playbook de promo par persona ---------------------

export interface AffiliatePlaybook {
  /** Angle d'accroche adapté au métier de l'affilié. */
  angle: string;
  /** Idées de quiz que l'affilié peut créer pour vendre Quizing à SON audience. */
  quizIdeas: string[];
  /** Niches / audiences à qui recommander l'Atelier du Quiz. */
  niches: string[];
}

const PLAYBOOKS: Record<Persona, AffiliatePlaybook> = {
  freelance: {
    angle:
      "Tes clients freelances galèrent à trouver des prospects qualifiés. Un quiz qui pré-qualifie, c'est exactement ce qui leur manque.",
    quizIdeas: [
      "« Quel type de freelance es-tu ? » qui segmente l'audience puis recommande l'Atelier du Quiz pour transformer ce diagnostic en machine à leads.",
      "« Ton offre est-elle assez claire pour vendre ? » : un quiz-audit qui finit sur l'Atelier du Quiz comme prochaine étape.",
      "« Combien de clients tu rates faute de tunnel ? » pour créer le déclic, puis ton lien affilié.",
    ],
    niches: [
      "Freelances et prestataires qui veulent arrêter le bouche-à-oreille",
      "Consultants qui vendent du temps et veulent scaler",
      "Communautés Malt / Comet / groupes Slack de freelances",
    ],
  },
  infopreneur: {
    angle:
      "Tu vends des formations : tu sais à quel point un bon quiz convertit mieux qu'un simple lead magnet. Montre-le et recommande la méthode.",
    quizIdeas: [
      "« Quel format de formation te correspond ? » qui capture des leads chauds, suivi de l'Atelier du Quiz pour ceux qui veulent reproduire le système.",
      "« Es-tu prêt à lancer ta première formation ? » : score de maturité + reco de l'Atelier du Quiz.",
      "« Ton tunnel de vente a-t-il un trou ? » pour révéler le manque d'un quiz d'entrée.",
    ],
    niches: [
      "Infopreneurs débutants qui peinent à remplir leur liste email",
      "Formateurs qui veulent segmenter avant de vendre",
      "Audiences de lancements / challenges en ligne",
    ],
  },
  coach: {
    angle:
      "Tes clients coachs cherchent des clients alignés. Un quiz qui révèle un profil, c'est l'outil parfait pour eux : recommande-le.",
    quizIdeas: [
      "« Quel est ton profil de [thème du coach] ? » qui crée de l'engagement, puis l'Atelier du Quiz pour ceux qui veulent leur propre quiz.",
      "« Es-tu prêt pour un accompagnement ? » : un quiz de pré-qualification que tes pairs voudront copier.",
      "« Quel blocage t'empêche d'avancer ? » suivi de ta recommandation Quizing.",
    ],
    niches: [
      "Coachs et consultants qui veulent des prospects pré-qualifiés",
      "Thérapeutes / praticiens du bien-être qui débutent en ligne",
      "Communautés de coachs (groupes Facebook, masterminds)",
    ],
  },
  auteur: {
    angle:
      "Tes lecteurs adorent les quiz ludiques. Transforme cet engagement en recommandation de l'Atelier du Quiz.",
    quizIdeas: [
      "« Quel personnage / archétype es-tu ? » dans ton univers, puis l'Atelier du Quiz pour les auteurs qui veulent capturer une audience.",
      "« Quel livre devrais-tu lire / écrire ensuite ? » avec capture email.",
      "« Connais-tu vraiment [ton thème] ? » un quiz de culture suivi de ton lien.",
    ],
    niches: [
      "Auteurs indépendants qui veulent une liste de lecteurs",
      "Créateurs de newsletters littéraires",
      "Communautés d'écriture et d'auto-édition",
    ],
  },
  createur: {
    angle:
      "Ton audience est énorme mais peu monétisée. Un quiz capture des emails et un revenu d'affiliation à la clé : montre-le.",
    quizIdeas: [
      "« Quel créateur es-tu ? » qui buzz, puis l'Atelier du Quiz pour transformer les vues en liste email.",
      "« Ton contenu te rapporte-t-il vraiment ? » : un quiz-révélateur sur la monétisation.",
      "« Quelle offre lancer à ta communauté ? » suivi de ton lien affilié.",
    ],
    niches: [
      "Créateurs de contenu qui veulent enfin monétiser leur audience",
      "Instagrammeurs / TikTokeurs sans liste email",
      "Communautés de créateurs et de newsletters",
    ],
  },
  affilie: {
    angle:
      "Tu connais déjà l'affiliation : ici c'est 70% sur la vente + 40% récurrent sur Tiquiz. Un des meilleurs deals que tu puisses promouvoir.",
    quizIdeas: [
      "« Quel produit d'affiliation te correspond ? » qui segmente, puis l'Atelier du Quiz comme produit phare à 70%.",
      "« Es-tu un affilié rentable ? » : un quiz-audit qui finit sur ta reco.",
      "« Quelle source de revenus passive lancer ? » suivi de ton lien.",
    ],
    niches: [
      "Affiliés et marketeurs qui cherchent des offres récurrentes",
      "Audiences make-money / revenus en ligne",
      "Communautés d'affiliation Systeme.io",
    ],
  },
  mlm: {
    angle:
      "Ton réseau cherche des outils simples pour recruter et vendre. Un quiz, c'est l'aimant à prospects idéal : recommande la méthode.",
    quizIdeas: [
      "« Es-tu fait pour le marketing de réseau ? » qui qualifie tes prospects, puis l'Atelier du Quiz.",
      "« Quel est ton profil d'entrepreneur ? » pour engager ton réseau.",
      "« Prêt à développer ton équipe en ligne ? » suivi de ton lien affilié.",
    ],
    niches: [
      "Leaders MLM qui veulent moderniser leur prospection",
      "Distributeurs qui débutent en ligne",
      "Équipes et lignées qui cherchent des outils duplicables",
    ],
  },
  autre: {
    angle:
      "L'Atelier du Quiz aide n'importe quel entrepreneur à capturer des leads avec un quiz. Recommande-le à ton audience.",
    quizIdeas: [
      "« Quel est ton profil d'entrepreneur ? » avec capture email, puis l'Atelier du Quiz.",
      "« Ton business a-t-il un tunnel qui convertit ? » : un quiz-audit.",
      "« Par quoi commencer pour vendre en ligne ? » suivi de ton lien affilié.",
    ],
    niches: [
      "Entrepreneurs et solopreneurs qui veulent plus de leads",
      "Petites entreprises qui débutent en ligne",
      "Audiences business / marketing francophones",
    ],
  },
};

export function getAffiliatePlaybook(activityType: string | null | undefined): AffiliatePlaybook {
  return PLAYBOOKS[resolvePersona(activityType)];
}

/** Arguments de vente communs (les "supers avantages" à mettre en avant). */
export const AFFILIATE_ARGUMENTS: { title: string; body: string }[] = [
  {
    title: "70% sur la vente",
    body: "Tu touches 70% du prix de chaque Atelier du Quiz vendu via ton lien, soit 32,90 € par vente à 47 €. Une des commissions les plus généreuses du marché.",
  },
  {
    title: "40% récurrent sur Tiquiz",
    body: "Chaque personne qui prend un abonnement Tiquiz te rapporte 40% chaque mois, tant qu'elle reste abonnée. Un revenu qui s'accumule.",
  },
  {
    title: "Un produit qui se recommande tout seul",
    body: "L'Atelier du Quiz transforme un quiz en machine à leads. C'est concret, démontrable, et ton audience en a besoin.",
  },
  {
    title: "Paiement automatique chaque mois",
    body: "Systeme.io te paie directement entre le 10 et le 13 de chaque mois. Tu n'as rien à gérer une fois ton lien en place.",
  },
];

/**
 * Phrase d'intro personnalisée selon le business du user (niche + maturité).
 * Reste générique et chaleureuse si les infos manquent.
 */
export function affiliateIntro(opts: {
  firstName?: string | null;
  niche?: string | null;
}): string {
  const name = (opts.firstName ?? "").trim();
  const hello = name ? `${name}, ` : "";
  const niche = (opts.niche ?? "").trim();
  if (niche) {
    return `${hello}ton audience (${niche}) a tout intérêt à créer des quiz pour capturer des leads. En la recommandant l'Atelier du Quiz, tu l'aides ET tu touches 70% de commission.`;
  }
  return `${hello}recommande l'Atelier du Quiz à ton audience : tu l'aides à capturer des leads avec des quiz, et tu touches 70% de commission sur chaque vente.`;
}
