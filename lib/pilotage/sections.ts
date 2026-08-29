// lib/pilotage/sections.ts
//
// LE PLAN DU CENTRE DE PILOTAGE (Béné, 29 août 2026).
//
// "Franchement tu trouves ça lisible et facile à exploiter ? Il faut
// TOUT repenser pour que je puisse vraiment avoir un centre de pilotage
// fiable, agréable et facile à comprendre et exploiter."
//
// Elle a raison, et le diagnostic tient en une phrase : ce n'était pas
// un tableau de bord, c'était une pile de cartes ajoutées au fil des
// demandes, chacune juste prise seule, dans TROIS admin séparés (6
// onglets Tiquiz, 7 écrans Tipote, 12 écrans Atelier). Personne n'avait
// jamais dessiné l'écran entier.
//
// -- LES QUATRE RÈGLES QUI EMPÊCHENT QUE ÇA RECOMMENCE ----------------
//
// 1. LA CONSOLE PILOTE, ELLE N'ÉDITE PAS. Écrire un jour de l'Atelier,
//    retoucher un quiz, éditer une page de vente : ça reste dans l'app
//    concernée. C'est cette ligne, et elle seule, qui empêche le
//    mélange de revenir.
// 2. UN CHIFFRE DESSINÉ EST UN CHIFFRE QU'ON SAIT JUSTE. Ce qui est
//    estimé porte sa mention, et on ne dessine pas un mois sans donnée.
// 3. CHAQUE SECTION RÉPOND À UNE QUESTION, et son nom EST la question.
// 4. CE QUI DEMANDE UNE ACTION REMONTE SUR L'ACCUEIL. Une alerte qu'il
//    faut aller chercher n'est pas une alerte.
//
// -- ET ON N'ÉTEINT RIEN AVANT D'AVOIR REMPLACÉ -----------------------
//
// Béné : "à terme on supprime les /admin de toutes les app pour tout
// gérer sur pilotage." D'accord, et c'est la cible. Mais une section
// pas encore construite doit DIRE où se fait le travail aujourd'hui :
// sinon on se retrouve sans l'outil et sans son remplaçant, un jour où
// on en a besoin. D'où `remplace` : tant qu'une section n'est pas
// `prete`, elle affiche le lien vers l'écran qui fait encore le travail.
//
// PUR : aucune lecture, aucun composant. Le menu, les titres et les
// tests lisent tous CETTE liste. Deux listes finiraient par diverger,
// c'est le motif de ce dépôt depuis trois mois.

// LES HÔTES NE S'ÉCRIVENT PAS ICI. Le test `affiliate-links` l'exige, et
// il a raison : une adresse écrite en dur à deux endroits ne se corrige
// jamais qu'à moitié (drame du rebrand "quizing", 3 août).

export type SectionId =
  | "accueil"
  | "clients"
  | "ventes"
  | "affilies"
  | "revendeurs"
  | "business"
  | "support"
  | "sante"
  | "parametres";

export interface Section {
  id: SectionId;
  /** Le chemin, sous /pilotage. Vide pour l'accueil. */
  chemin: string;
  /** Le nom court, celui du menu. */
  nom: string;
  /** La QUESTION à laquelle la section répond. C'est son sous-titre. */
  question: string;
  /** Construite, ou pas encore. */
  etat: "prete" | "a-venir";
  /**
   * LE SÉLECTEUR DE PÉRIODE A-T-IL UN SENS SUR CET ÉCRAN ?
   *
   * Béné le veut "partout", et il l'est : sur tout ce qui compte des
   * euros ou des personnes dans le temps. Mais un annuaire, une file de
   * support, l'état des clés et la liste des réglages ne se filtrent
   * pas par mois : y laisser le sélecteur en ferait un bouton qui ne
   * fait rien, et un bouton qui ne fait rien est pire qu'un bouton
   * absent, parce qu'on le reclique.
   *
   * L'écran concerné le DIT quand même, en une phrase ("cet annuaire ne
   * suit pas le filtre de période") : un contrôle qui disparaît sans un
   * mot se lit comme un bug.
   */
  periode: boolean;
  /**
   * L'écran qui fait encore le travail aujourd'hui. Obligatoire tant que
   * la section n'est pas prête : une section qui annonce "bientôt" sans
   * dire où aller est un cul-de-sac.
   */
  remplace?: { libelle: string; href: string }[];
}

export const SECTIONS: readonly Section[] = [
  {
    id: "accueil",
    chemin: "",
    nom: "Accueil",
    question: "Qu'est-ce qui demande mon attention aujourd'hui ?",
    etat: "prete",
    periode: true,
  },
  {
    id: "clients",
    chemin: "/clients",
    nom: "Clients et élèves",
    question: "Qui sont ces personnes, qu'ont-elles payé, qu'ont-elles comme accès ?",
    etat: "prete",
    periode: false,
  },
  {
    id: "ventes",
    chemin: "/ventes",
    nom: "Ventes",
    question: "Qui a acheté quoi, quand, comment, via qui, et combien il paie ?",
    etat: "prete",
    periode: true,
  },
  {
    id: "affilies",
    chemin: "/affilies",
    nom: "Affiliés",
    question: "Qui recommande quoi, et combien je leur dois ?",
    etat: "prete",
    periode: false,
  },
  {
    id: "revendeurs",
    chemin: "/revendeurs",
    nom: "Revendeurs",
    question: "Qui revend Tiquiz, avec quel portefeuille, et que reste-t-il à encaisser ?",
    etat: "prete",
    periode: false,
  },
  {
    id: "business",
    chemin: "/business",
    nom: "Business",
    question: "Ce qui rentre contre ce qui sort, ce mois et le mois prochain.",
    etat: "prete",
    periode: true,
  },
  {
    id: "support",
    chemin: "/support",
    nom: "Support",
    question: "Qui attend une réponse, et depuis combien de temps ?",
    etat: "prete",
    periode: false,
  },
  {
    id: "sante",
    chemin: "/sante",
    nom: "Santé des app",
    question: "Qu'est-ce qui casse ou qu'il faut surveiller en ce moment ?",
    etat: "prete",
    periode: false,
  },
  {
    id: "parametres",
    chemin: "/parametres",
    nom: "Paramètres",
    question: "Ce qui fait tourner les app et circuler l'argent.",
    etat: "prete",
    periode: false,
  },
];

/** Le chemin complet d'une section. */
export function cheminSection(s: Pick<Section, "chemin">): string {
  return `/pilotage${s.chemin}`;
}

/**
 * La section active pour ce chemin.
 *
 * On prend la correspondance la PLUS LONGUE : `/pilotage/clients/x@y.fr`
 * doit éclairer "Clients", pas "Accueil" dont le chemin est vide et
 * préfixe donc tout le reste.
 */
export function sectionActive(pathname: string): Section {
  const p = String(pathname ?? "").replace(/\/+$/, "") || "/pilotage";
  let gagnante = SECTIONS[0];
  for (const s of SECTIONS) {
    if (!s.chemin) continue;
    const complet = cheminSection(s);
    if (p === complet || p.startsWith(`${complet}/`)) {
      if (s.chemin.length > (gagnante.chemin?.length ?? 0)) gagnante = s;
    }
  }
  return gagnante;
}
