// lib/pilotage/sante.ts
//
// QU'EST-CE QUI CASSE, OU QU'IL FAUT SURVEILLER (Béné, 29 août 2026).
//
// -- CE QUI CASSE ICI NE FAIT PAS DE BRUIT ----------------------------
//
// Toutes les pannes de ces dépôts ont la même signature : rien ne
// s'affiche en rouge, un chiffre est juste faux ou une donnée n'arrive
// pas. La colonne `quiz_events.meta` a coûté quinze jours de
// statistiques. Le mois de juin s'est passé sans la table
// `quiz_events`. Le 22 août, les deux app ont servi la base de l'autre
// pendant une journée. Aucune de ces trois pannes n'aurait été trouvée
// en regardant un écran : il fallait aller SONDER.
//
// Cette section fait ces sondages, une fois, à un endroit.
//
// -- TROIS FAMILLES, ET ELLES NE SE CORRIGENT PAS AU MÊME ENDROIT -----
//
//   les appels reçus   un paiement arrivé sans accès ouvert
//   les liaisons       une autre app qui ne répond pas, donc des
//                      chiffres muets qui passent pour des zéros
//   les fondations     une table absente (migration en retard), une clé
//                      qui ne parle pas du même projet que l'URL
//
// PUR : `maintenant` est un paramètre, l'appelant apporte les lignes.
// Aucune lecture de base, aucun `process.env`.

import { compterActions, type CallRow } from "@/lib/admin/webhookRows";

// ── LES APPELS REÇUS ─────────────────────────────────────────────────

/**
 * Au delà de ce délai, un appel resté "en cours" ne sera JAMAIS repris.
 *
 * Le verrou des webhooks (24 août) laisse un autre essai reprendre une
 * ligne bloquée depuis plus de deux minutes. Une ligne encore "en
 * cours" une heure plus tard veut donc dire qu'AUCUN réessai n'est
 * venu, et qu'aucun ne viendra : le fournisseur a arrêté. C'est de
 * l'argent encaissé dont personne ne s'occupe plus.
 *
 * Une heure, et pas deux minutes : entre les deux, un réessai normal est
 * encore attendu, et crier là dessus ferait rougir l'écran à chaque
 * paiement.
 */
export const SEUIL_BLOQUE_MS = 60 * 60 * 1000;

export interface LigneAppel extends CallRow {
  receivedAt: string;
}

export interface VerdictAppels {
  /** Combien demandent vraiment une action (panne, ou payé sans accès). */
  aRegarder: number;
  /** Restés "en cours" au delà du délai : plus aucun réessai ne viendra. */
  bloques: number;
  /** Combien de lignes ont été lues, pour dire sur quoi on se prononce. */
  lues: number;
}

/** Une ligne restée "en cours" trop longtemps pour espérer un réessai. */
export function estBloque(ligne: LigneAppel, maintenant: Date): boolean {
  if (String(ligne.status ?? "").trim().toLowerCase() !== "processing") return false;
  const t = Date.parse(String(ligne.receivedAt ?? ""));
  if (!Number.isFinite(t)) return false;
  return maintenant.getTime() - t >= SEUIL_BLOQUE_MS;
}

/**
 * Ce que disent les derniers appels reçus.
 *
 * `aRegarder` vient de `compterActions`, la MÊME fonction que l'écran
 * des appels : deux comptes calculés séparément finissent toujours par
 * se contredire, et c'est celui du haut qu'on croit.
 */
export function verdictAppels(
  lignes: readonly LigneAppel[],
  maintenant: Date,
): VerdictAppels {
  return {
    aRegarder: compterActions(lignes),
    bloques: lignes.filter((l) => estBloque(l, maintenant)).length,
    lues: lignes.length,
  };
}

// ── LES FONDATIONS : CE DONT LA CONSOLE A BESOIN POUR DIRE VRAI ──────

export type EtatSonde = "ok" | "absente" | "illisible";

export interface Dependance {
  /** La table sondée. */
  table: string;
  /** La colonne, quand c'est elle qui a été ajoutée après coup. */
  colonne?: string;
  /** Le fichier à appliquer si elle manque. */
  migration: string;
  /** Sur QUEL Supabase. Les deux ne se corrigent pas au même endroit. */
  base: "tiquiz" | "tipote";
  /** Ce qui ne marche pas, en clair, tant qu'elle manque. */
  sansElle: string;
}

/**
 * CE QUE LA CONSOLE LIT, ET CE QUI SE TAIT QUAND ÇA MANQUE.
 *
 * On ne re-vérifie PAS les 523 migrations du dépôt : ça se fait avec
 * `npm run check:migrations-pending`, qui pose une question par table et
 * met une minute. Ici on sonde ce dont CET écran dépend, parce qu'une
 * migration en retard s'y traduit par une section vide, c'est à dire par
 * une bonne nouvelle qui n'en est pas une.
 *
 * Une table ajoutée à cette liste doit dire ce qui se tait sans elle :
 * "table absente" seul n'a jamais aidé personne à décider quoi faire.
 */
export const DEPENDANCES_CONSOLE: readonly Dependance[] = [
  {
    table: "alertes_traitees",
    migration: "supabase/migrations/20260829_alertes_traitees.sql",
    base: "tiquiz",
    sansElle:
      "Le bouton marquer comme traité, sur l'accueil, ne garde rien : "
      + "l'alerte revient au prochain chargement.",
  },
  {
    table: "webhook_logs",
    migration: "supabase/migrations/002_plan_system.sql",
    base: "tiquiz",
    sansElle:
      "On ne sait plus si un paiement est arrivé jusqu'à nous, ni ce que le "
      + "routage en a fait.",
  },
  {
    table: "support_tickets",
    migration: "supabase/migrations/20260822_support_tickets.sql",
    base: "tiquiz",
    sansElle: "La file du support est vide, et ça se lit comme si personne n'écrivait.",
  },
  {
    table: "support_tickets",
    colonne: "product",
    migration: "supabase/migrations/20260823_support_tickets_produit.sql",
    base: "tiquiz",
    sansElle:
      "Toutes les demandes sont taggées Tiquiz, y compris celles de "
      + "L'Atelier : la réponse part à côté.",
  },
  {
    table: "factures",
    migration: "supabase/migrations/20260824_facturation.sql",
    base: "tiquiz",
    sansElle: "Aucune facture n'est émise sur une vente PayPal.",
  },
];

/**
 * CE QUE L'ESPACE AFFILIÉ DIT QU'IL N'A PAS PU LIRE.
 *
 * Sa route partenaire rend un `manque` : une table ou une vue absente y
 * fait perdre une COLONNE, pas la page (c'est voulu). Mais du coup
 * l'écran affiche zéro clic là où il y en a eu, et rien ne distingue ça
 * d'un affilié qui n'a rien fait. Le zéro se lit comme une donnée : il
 * faut donc que la cause remonte ici.
 *
 * La clé est celle du `manque` renvoyé par Tipote. Une clé inconnue est
 * ignorée : on ne fabrique pas un message pour un signal qu'on ne
 * comprend pas.
 */
export const DEPENDANCES_AFFILIE: Readonly<Record<string, Dependance>> = {
  alias: {
    table: "affiliate_sa_aliases",
    migration: "supabase/migrations/20260829_affiliate_sa_aliases.sql",
    base: "tipote",
    sansElle:
      "Les clics et les contacts arrivés par l'ancien lien d'un affilié qui a deux "
      + "identifiants Systeme.io ne sont attribués à personne.",
  },
  clics: {
    table: "affiliate_stats",
    migration: "supabase/migrations/ (vue affiliate_stats)",
    base: "tipote",
    sansElle: "Tous les affiliés affichent zéro clic, y compris ceux qui en ont.",
  },
  conversions: {
    table: "affiliate_conversions",
    migration: "supabase/migrations/ (table affiliate_conversions)",
    base: "tipote",
    sansElle: "Aucun filleul n'apparaît, y compris ceux qui existent.",
  },
  commissions: {
    table: "affiliate_commissions",
    migration: "supabase/migrations/ (table affiliate_commissions)",
    base: "tipote",
    sansElle:
      "Aucune commission n'apparaît : la section Affiliés et le coût dans Business "
      + "montrent zéro euro alors qu'on doit peut être de l'argent.",
  },
};

/**
 * Ce que le `manque` de l'espace affilié devient, ici.
 *
 * Les clés à `false` ne produisent rien : elles disent que la lecture a
 * marché.
 */
export function sondesAffilie(
  manque: Readonly<Record<string, boolean>> | null | undefined,
): ResultatSonde[] {
  if (!manque) return [];
  const out: ResultatSonde[] = [];
  for (const [cle, absent] of Object.entries(manque)) {
    if (!absent) continue;
    const d = DEPENDANCES_AFFILIE[cle];
    if (!d) continue;
    out.push({ ...d, etat: "absente" });
  }
  return out;
}

export interface ResultatSonde extends Dependance {
  etat: EtatSonde;
  /** Ce que la base a répondu, quand ce n'est ni ok ni une absence. */
  detail?: string;
}

/**
 * Ce qu'une réponse de PostgREST dit de l'existence d'une table.
 *
 * NARROW EXPRÈS : on ne cherche pas à valider un schéma (c'est le
 * travail de `check:migrations-pending`), seulement à distinguer trois
 * cas qui appellent trois réactions différentes : c'est là, ce n'est pas
 * là, ou on n'a pas pu regarder.
 *
 * "Je n'ai pas trouvé" et "il n'y a rien" sont deux réponses
 * différentes, et les confondre a déjà produit un rapport faux
 * (22 août).
 */
export function lireSonde(statut: number, texte: string): EtatSonde {
  if (statut === 200 || statut === 206) return "ok";
  if (
    statut === 404 ||
    /PGRST205|PGRST204|42703|does not exist|could not find the/i.test(String(texte ?? ""))
  ) {
    return "absente";
  }
  // Une erreur de droits ne veut PAS dire absente : la table est là, on
  // n'a pas pu la lire. Dire "absente" enverrait appliquer une migration
  // qui existe déjà.
  return "illisible";
}

/** Ce qui manque vraiment, dans l'ordre où ça se corrige. */
export function manquantes(sondes: readonly ResultatSonde[]): ResultatSonde[] {
  return sondes.filter((s) => s.etat === "absente");
}

// ── LE VERDICT D'ENSEMBLE ────────────────────────────────────────────

export type Gravite = "ok" | "surveiller" | "casse";

export interface EtatSante {
  gravite: Gravite;
  /** Une ligne par chose à faire, la plus grave d'abord. */
  points: string[];
}

export interface EntreeSante {
  appels: VerdictAppels | null;
  sondes: readonly ResultatSonde[] | null;
  /** Les clés Supabase parlent-elles du même projet ? `null` = pas su. */
  clesCoherentes: boolean | null;
  /** Les autres app répondent-elles ? */
  liaisons: readonly { nom: string; ok: boolean; raison: string | null }[];
}

/**
 * L'état, en un mot et quelques lignes.
 *
 * CE QU'ON NE SAIT PAS N'EST JAMAIS COMPTÉ COMME "OK" : un contrôle qui
 * n'a pas pu tourner rend `null`, et l'écran le dit. Traiter l'ignorance
 * comme une bonne nouvelle est exactement ce qui a laissé passer quinze
 * jours de statistiques perdues.
 */
export function etatSante(e: EntreeSante): EtatSante {
  const points: string[] = [];
  let casse = false;
  let surveiller = false;

  if (e.clesCoherentes === false) {
    casse = true;
    points.push(
      "La clé Supabase et l'URL ne parlent pas du même projet : cette app sert "
      + "la base de l'autre. Ne rien construire ni redémarrer avant d'avoir corrigé.",
    );
  } else if (e.clesCoherentes === null) {
    surveiller = true;
    points.push("On n'a pas pu vérifier que la clé Supabase parle du bon projet.");
  }

  if (e.appels === null) {
    surveiller = true;
    points.push("Les appels reçus n'ont pas pu être lus : on ne sait pas si un paiement s'est perdu.");
  } else {
    if (e.appels.bloques > 0) {
      casse = true;
      points.push(
        `${e.appels.bloques} appel${e.appels.bloques > 1 ? "s" : ""} resté${e.appels.bloques > 1 ? "s" : ""} `
        + "en cours de traitement depuis plus d'une heure : aucun réessai ne viendra plus.",
      );
    }
    if (e.appels.aRegarder > 0) {
      casse = true;
      points.push(
        `${e.appels.aRegarder} appel${e.appels.aRegarder > 1 ? "s" : ""} demande`
        + `${e.appels.aRegarder > 1 ? "nt" : ""} une action : payé sans accès ouvert, ou traitement en panne.`,
      );
    }
  }

  if (e.sondes === null) {
    surveiller = true;
    points.push("Les tables dont dépend cette console n'ont pas pu être sondées.");
  } else {
    for (const s of manquantes(e.sondes)) {
      casse = true;
      points.push(
        `${s.colonne ? `${s.table}.${s.colonne}` : s.table} manque sur le Supabase de `
        + `${s.base === "tiquiz" ? "Tiquiz" : "Tipote"}. ${s.sansElle}`,
      );
    }
    for (const s of e.sondes) {
      if (s.etat !== "illisible") continue;
      surveiller = true;
      points.push(`${s.table} n'a pas pu être lue. Elle existe peut être : on n'a pas pu regarder.`);
    }
  }

  for (const l of e.liaisons) {
    if (l.ok) continue;
    // Une liaison muette ne casse pas l'app : elle rend des chiffres
    // INCOMPLETS, ce qui est pire si on ne le sait pas.
    surveiller = true;
    points.push(
      `${l.nom} ne répond pas${l.raison ? ` (${l.raison})` : ""} : ses chiffres manquent aux totaux.`,
    );
  }

  return { gravite: casse ? "casse" : surveiller ? "surveiller" : "ok", points };
}
