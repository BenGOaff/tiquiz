// lib/integrations/fournisseurs.ts
//
// LE CATALOGUE DES OUTILS QU'ON SAIT (OU QU'ON SAURA) CONNECTER.
//
// Béné, 14 septembre 2026 : "on doit lui laisser le choix de
// synchroniser ses leads avec l'outil de son choix, comme Quizify : dans
// les paramètres, proposer toutes les connexions disponibles, activer ou
// désactiver la synchro, alerte mail si déconnecté, pages d'aide."
//
// PUR : aucun import, l'écran des paramètres ET les tests le lisent.
//
// -- CE QUI EST DISPONIBLE ET CE QUI NE L'EST PAS ---------------------
//
// `disponible: false` veut dire "la carte s'affiche, le bouton est
// grisé, et la carte le DIT". Une carte absente ferait croire que
// l'outil n'est pas prévu ; une carte qui promet un bouton qui ne fait
// rien est pire. On ne liste que les outils que Béné a nommés (ClickFunnels,
// Podia, Brevo), pas un catalogue de vingt logos qui sont autant de
// promesses.
//
// -- SYSTEME.IO EST À PART, ET C'EST VOULU ---------------------------
//
// Ses clés vivent dans `sio_api_keys` depuis mai, avec leur propre
// écran, leur propre cascade (clé du quiz, défaut du projet, clé du
// projet, colonne historique) et leurs propres tests. Les déplacer
// ferait bouger le seul chemin qui envoie des leads aujourd'hui, pour
// une différence que personne ne verrait à l'écran. L'onglet Connexions
// AFFICHE Systeme.io à côté des autres ; sa mécanique ne bouge pas.

export type Fournisseur = "systemeio" | "gohighlevel" | "brevo" | "clickfunnels" | "podia";

export interface FicheFournisseur {
  id: Fournisseur;
  nom: string;
  /** Un outil dont l'adaptateur existe. */
  disponible: boolean;
  /** Le chemin de sa page d'aide sur tiquiz.fr (relatif, sans langue). */
  aide: string | null;
  /** Le site de l'outil, pour la carte. */
  site: string;
  /** Les deux premières lettres, pour la pastille (aucune image externe). */
  initiales: string;
  /** Une teinte de pastille, relevée sur la marque. */
  couleur: string;
}

export const FOURNISSEURS: readonly FicheFournisseur[] = [
  {
    id: "systemeio",
    nom: "Systeme.io",
    disponible: true,
    aide: "/integrations",
    site: "https://systeme.io",
    initiales: "S",
    couleur: "#1BA1E2",
  },
  {
    id: "gohighlevel",
    nom: "GoHighLevel",
    disponible: true,
    aide: "/integrations/gohighlevel",
    site: "https://www.gohighlevel.com",
    initiales: "HL",
    couleur: "#1E6BFF",
  },
  {
    id: "brevo",
    nom: "Brevo",
    disponible: false,
    aide: null,
    site: "https://www.brevo.com",
    initiales: "B",
    couleur: "#0B996E",
  },
  {
    id: "clickfunnels",
    nom: "ClickFunnels",
    disponible: false,
    aide: null,
    site: "https://www.clickfunnels.com",
    initiales: "CF",
    couleur: "#E6412C",
  },
  {
    id: "podia",
    nom: "Podia",
    disponible: false,
    aide: null,
    site: "https://www.podia.com",
    initiales: "P",
    couleur: "#4B3BFF",
  },
];

/** Les fournisseurs qui vivent dans `connexions_crm` (tous sauf Systeme.io). */
export const FOURNISSEURS_CRM: readonly Fournisseur[] = FOURNISSEURS.filter(
  (f) => f.disponible && f.id !== "systemeio",
).map((f) => f.id);

export function ficheFournisseur(id: string): FicheFournisseur | null {
  return FOURNISSEURS.find((f) => f.id === id) ?? null;
}

/** Vrai si ce fournisseur a un adaptateur et vit dans `connexions_crm`. */
export function estFournisseurCrm(id: unknown): id is Exclude<Fournisseur, "systemeio"> {
  return typeof id === "string" && (FOURNISSEURS_CRM as readonly string[]).includes(id);
}
