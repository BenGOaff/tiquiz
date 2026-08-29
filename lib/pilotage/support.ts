// lib/pilotage/support.ts
//
// QUI ATTEND UNE RÉPONSE, ET DEPUIS COMBIEN DE TEMPS (Béné, 29 août).
//
// L'ordre de la file, le retard et le résumé existent déjà et sont
// testés (`lib/support/tickets.ts`) : ce module ne les réécrit PAS. Il
// ajoute la seule chose qui manquait pour travailler une file qui
// grossit : la trier du regard, c'est à dire filtrer.
//
// -- LE DÉFAUT EST "À TRAITER", ET C'EST LA QUESTION DE LA SECTION ----
//
// "Qui attend une réponse ?" Ouvrir sur TOUT mettrait les demandes
// closes au milieu de celles qui attendent, et il faudrait chercher.
// L'onglet dit combien il en reste : une file vide est alors une bonne
// nouvelle lisible, pas un écran cassé.
//
// -- LES COMPTEURS DES ONGLETS SONT FACETTÉS --------------------------
//
// Le compteur d'un onglet est calculé avec TOUS les autres filtres
// appliqués, sauf le sien. Sans ça, un onglet annonce 12 et n'affiche
// rien parce qu'un filtre produit est resté actif ailleurs : le chiffre
// et l'écran se contredisent, et c'est le chiffre qu'on croit.
//
// PUR : pas d'horloge interne (`maintenant` est un paramètre, sinon le
// test clignote), pas de base.

import {
  estEnRetard,
  heuresDAttente,
  trierFile,
  type Ticket,
} from "@/lib/support/tickets";
import { normaliserProduit, type ProduitSupport } from "@/lib/support/produit";

/** Les onglets de la file. `tous` n'est pas un état, c'est l'absence de filtre. */
export type EtatFiltre = "a-traiter" | "en-retard" | "repondues" | "closes" | "tous";

export const ETATS_FILTRE: readonly EtatFiltre[] = [
  "a-traiter",
  "en-retard",
  "repondues",
  "closes",
  "tous",
];

export const ETAT_DEFAUT: EtatFiltre = "a-traiter";

export const LIBELLE_ETAT: Readonly<Record<EtatFiltre, string>> = {
  "a-traiter": "À traiter",
  "en-retard": "En retard",
  repondues: "Répondues",
  closes: "Closes",
  tous: "Toutes",
};

export interface FiltreSupport {
  etat: EtatFiltre;
  /** `null` = tous les produits. */
  produit: ProduitSupport | null;
  /** Ce qui a été tapé dans la recherche. Vide = pas de recherche. */
  recherche: string;
}

export const FILTRE_VIDE: FiltreSupport = {
  etat: ETAT_DEFAUT,
  produit: null,
  recherche: "",
};

/** Une valeur venue d'un menu ou d'une URL, ramenée à un onglet connu. */
export function lireEtatFiltre(v: unknown): EtatFiltre {
  const s = String(v ?? "").trim().toLowerCase();
  return (ETATS_FILTRE as readonly string[]).includes(s) ? (s as EtatFiltre) : ETAT_DEFAUT;
}

/**
 * Ce qu'on compare quand quelqu'un cherche.
 *
 * Les accents sautent des DEUX côtés : Béné tape "eric" et doit trouver
 * "Éric". Une recherche qui rate à cause d'un accent se lit "ce client
 * n'existe pas", et c'est faux.
 */
function aplatir(v: unknown): string {
  return String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Le ticket correspond-il à ce qui a été tapé ? */
export function correspond(t: Ticket, recherche: string): boolean {
  const q = aplatir(recherche);
  if (!q) return true;
  // Tous les mots doivent être quelque part : "eric acces" trouve le
  // ticket d'Éric sur ses accès, sans exiger l'ordre.
  const foin = aplatir([t.email, t.name, t.subject, t.message].join(" "));
  return q.split(/\s+/).every((mot) => foin.includes(mot));
}

/** Ce ticket passe-t-il l'onglet demandé ? */
export function passeEtat(t: Ticket, etat: EtatFiltre, maintenant: Date): boolean {
  switch (etat) {
    case "a-traiter":
      return t.status === "open";
    case "en-retard":
      return estEnRetard(t, maintenant);
    case "repondues":
      return t.status === "replied";
    case "closes":
      return t.status === "closed";
    case "tous":
      return true;
  }
}

function passeProduit(t: Ticket, produit: ProduitSupport | null): boolean {
  return produit === null || normaliserProduit(t.product) === produit;
}

/**
 * La file filtrée, dans l'ORDRE DE LA FILE.
 *
 * Le tri vient de `trierFile` et n'est pas refait ici : ce qui attend le
 * plus longtemps passe devant, filtre ou pas.
 */
export function filtrerFile(
  tickets: readonly Ticket[],
  filtre: FiltreSupport,
  maintenant: Date,
): Ticket[] {
  return trierFile(
    tickets.filter(
      (t) =>
        passeEtat(t, filtre.etat, maintenant) &&
        passeProduit(t, filtre.produit) &&
        correspond(t, filtre.recherche),
    ),
  );
}

export interface Facettes {
  parEtat: Record<EtatFiltre, number>;
  /** Une entrée par produit, `null` porte le total tous produits. */
  parProduit: Record<ProduitSupport, number>;
  tousProduits: number;
}

/**
 * Les compteurs des onglets, chacun calculé SANS son propre filtre.
 *
 * C'est ce qui garantit qu'un onglet qui annonce 12 en affiche 12 quand
 * on clique dessus. Deux chiffres calculés séparément finissent
 * toujours par se contredire, et ici la contradiction se voit tout de
 * suite.
 */
export function facettes(
  tickets: readonly Ticket[],
  filtre: FiltreSupport,
  maintenant: Date,
): Facettes {
  const parEtat = {} as Record<EtatFiltre, number>;
  for (const e of ETATS_FILTRE) {
    parEtat[e] = tickets.filter(
      (t) =>
        passeEtat(t, e, maintenant) &&
        passeProduit(t, filtre.produit) &&
        correspond(t, filtre.recherche),
    ).length;
  }

  const base = tickets.filter(
    (t) => passeEtat(t, filtre.etat, maintenant) && correspond(t, filtre.recherche),
  );
  const parProduit = { tiquiz: 0, atelier: 0, tipote: 0 } as Record<ProduitSupport, number>;
  for (const t of base) parProduit[normaliserProduit(t.product)] += 1;

  return { parEtat, parProduit, tousProduits: base.length };
}

/**
 * LA PLUS LONGUE ATTENTE, en heures, parmi ce qui n'a pas de réponse.
 *
 * C'est le chiffre qui dit s'il y a urgence, et il porte sur UNE
 * personne réelle. Une moyenne d'attente noierait celle qui attend
 * depuis quatre jours dans dix demandes traitées le matin.
 *
 * Rend `null` quand personne n'attend : afficher "0 h" ferait croire
 * qu'on vient de répondre à quelqu'un.
 */
export function pireAttenteHeures(
  tickets: readonly Ticket[],
  maintenant: Date,
): number | null {
  let pire: number | null = null;
  for (const t of tickets) {
    if (t.status !== "open") continue;
    const h = heuresDAttente(t, maintenant);
    if (pire === null || h > pire) pire = h;
  }
  return pire;
}

/** Une attente écrite pour un humain, à partir d'heures. */
export function attenteLisible(heures: number): string {
  const h = Math.max(0, Number(heures) || 0);
  if (h < 1) return "moins d'une heure";
  if (h < 24) return `${Math.floor(h)} h`;
  const j = Math.floor(h / 24);
  return `${j} jour${j > 1 ? "s" : ""}`;
}
