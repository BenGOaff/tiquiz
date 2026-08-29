// lib/pilotage/clients.ts
//
// TOUTES LES PERSONNES DE TOUTES LES APP (Béné, 29 août 2026).
//
// "Je dois voir toutes les personnes qui sont sur mes app, ou qui l'ont
// été."
//
// Le "ou qui l'ont été" n'est pas un détail de formulation : quelqu'un
// qui est parti reste dans la liste, avec son historique. Une liste qui
// ne montrerait que les clients actifs ferait disparaître ceux qu'on
// voudrait justement rappeler, et le départ lui même deviendrait
// invisible.
//
// -- POURQUOI DES FILTRES ET PAS UN SEUL TABLEAU ----------------------
//
// Avec 195 comptes on lit tout ; avec 200 000, la seule question qui
// compte est "montre moi CE groupe". Les filtres portent donc leur
// NOMBRE : voir "abonnés 42" à côté de "partis 8" dit la forme de la
// base avant même de cliquer.
//
// PUR : ni horloge ni base. Le tri et le filtre sont testables, et le
// composant se contente d'appeler.

import type { Person, PersonStatus } from "@/lib/admin/people";
import {
  APPARTENANCES_ORDRE,
  estDe,
  type Appartenance,
} from "@/lib/pilotage/appartenance";

export type FiltreStatut = "tous" | PersonStatus;
/**
 * LE FILTRE PRODUIT SUIT LES PASTILLES.
 *
 * Il était bâti sur `ClientKind` ("tiquiz | atelier | les-deux |
 * aucun"), une réponse à choix unique : impossible d'y faire entrer
 * Tipote sans inventer "les-trois". Une personne peut être cliente de
 * plusieurs choses, donc on filtre sur UNE appartenance et on garde
 * tous ceux qui l'ont, quelles que soient les autres.
 */
export type FiltreProduit = "tous" | Appartenance;
export type TriClients = "recents" | "paye" | "activite" | "alpha";

export interface CritereClients {
  recherche: string;
  statut: FiltreStatut;
  produit: FiltreProduit;
  tri: TriClients;
}

export const CRITERES_PAR_DEFAUT: CritereClients = {
  recherche: "",
  statut: "tous",
  produit: "tous",
  // Les derniers arrivés d'abord : c'est ce qu'on vient voir en ouvrant
  // l'écran, et ça donne un signe de vie immédiat.
  tri: "recents",
};

/** L'ordre des statuts dans les filtres. Payants en tête. */
export const ORDRE_STATUTS: readonly PersonStatus[] = [
  "abonne",
  "avie",
  "partant",
  "atelier",
  "essai",
  "parti",
];

export const NOM_STATUT: Record<PersonStatus, string> = {
  abonne: "Abonnés",
  avie: "À vie",
  partant: "Partent bientôt",
  atelier: "Élèves de l'Atelier",
  essai: "En gratuit",
  parti: "Partis",
};

/** Le temps d'une date, ou `null` si elle est illisible. */
function instant(v: string | null | undefined): number | null {
  const t = Date.parse(String(v ?? ""));
  return Number.isFinite(t) ? t : null;
}

/**
 * La personne correspond-elle à la recherche ?
 *
 * Sur l'adresse ET le nom : on cherche parfois "jocelyne", parfois
 * "@gmail". Chercher sur un seul des deux oblige à savoir lequel avant
 * de taper.
 */
function correspond(p: Person, q: string): boolean {
  if (!q) return true;
  const bas = q.toLowerCase();
  return (
    p.email.toLowerCase().includes(bas) || String(p.name ?? "").toLowerCase().includes(bas)
  );
}

/** Le nombre de personnes par statut, pour que le filtre porte son compte. */
export function compterParStatut(people: readonly Person[]): Record<string, number> {
  const par: Record<string, number> = { tous: people.length };
  for (const p of people) par[p.status] = (par[p.status] ?? 0) + 1;
  return par;
}

/**
 * Le nombre de personnes par APPARTENANCE, pour que le filtre produit
 * porte son compte comme celui des statuts.
 *
 * Une personne cliente de deux produits est comptée dans les deux : les
 * colonnes ne s'additionnent donc pas au total, et c'est normal. Ce
 * qu'on veut savoir, c'est "combien de gens ont l'Atelier", pas une
 * partition.
 */
export function compterParProduit(people: readonly Person[]): Record<string, number> {
  const par: Record<string, number> = { tous: people.length };
  for (const p of people) {
    for (const a of APPARTENANCES_ORDRE) if (estDe(p, a)) par[a] = (par[a] ?? 0) + 1;
  }
  return par;
}

/** Filtre et range. */
export function filtrerClients(
  people: readonly Person[],
  c: CritereClients,
): Person[] {
  const q = c.recherche.trim();

  const gardees = people.filter((p) => {
    if (c.statut !== "tous" && p.status !== c.statut) return false;
    if (c.produit !== "tous" && !estDe(p, c.produit)) return false;
    return correspond(p, q);
  });

  const parDate = (a: string | null | undefined, b: string | null | undefined) => {
    const ta = instant(a);
    const tb = instant(b);
    // UNE DATE ILLISIBLE VA À LA FIN, jamais en tête : un tri naif la
    // met au sommet dans la moitié des moteurs, donc l'écran s'ouvre
    // sur ce qu'on connaît le moins bien.
    if (ta === null && tb === null) return 0;
    if (ta === null) return 1;
    if (tb === null) return -1;
    return tb - ta;
  };

  const range = [...gardees];
  switch (c.tri) {
    case "paye":
      range.sort((a, b) => b.paidCents - a.paidCents || parDate(a.createdAt, b.createdAt));
      break;
    case "activite":
      range.sort((a, b) => parDate(a.lastSignIn, b.lastSignIn));
      break;
    case "alpha":
      range.sort((a, b) =>
        String(a.name ?? a.email).localeCompare(String(b.name ?? b.email), "fr"),
      );
      break;
    case "recents":
    default:
      range.sort((a, b) => parDate(a.createdAt, b.createdAt));
  }
  return range;
}
