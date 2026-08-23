// lib/facture/identite.ts
//
// QUI VEND, QUI ACHÈTE, ET CE QU'IL MANQUE.
//
// Les mentions obligatoires d'une facture française tiennent en une
// liste, et une seule case vide la rend contestable. Ce module dit ce
// qu'on a, ce qui manque, et il NE BLOQUE JAMAIS : la règle du 7 août
// ("il a payé le client, il doit recevoir ses accès, point barre")
// s'applique à sa facture. On émet, on marque ce qui manque, l'admin le
// voit sur sa fiche.

import { COMPANY } from "@/lib/legal/company";
import { normaliserNumeroTva, normaliserPays } from "@/lib/facture/tva";

/** Le vendeur, recopié sur chaque facture. Une seule source : COMPANY. */
export interface Vendeur {
  denomination: string;
  forme: string;
  capital: string;
  rcs: string;
  tva: string;
  adresse: string;
  email: string;
}

export function vendeur(): Vendeur {
  return {
    denomination: COMPANY.name,
    forme: COMPANY.form,
    capital: COMPANY.capital,
    rcs: COMPANY.rcs,
    tva: COMPANY.vat,
    adresse: COMPANY.address,
    email: COMPANY.email,
  };
}

/** Ce que le client renseigne, et ce que la facture recopie. */
export interface Acheteur {
  email: string | null;
  prenom: string | null;
  nom: string | null;
  societe: string | null;
  tvaNumero: string | null;
  adresse1: string | null;
  adresse2: string | null;
  codePostal: string | null;
  ville: string | null;
  pays: string | null;
}

export const ACHETEUR_VIDE: Acheteur = {
  email: null, prenom: null, nom: null, societe: null, tvaNumero: null,
  adresse1: null, adresse2: null, codePostal: null, ville: null, pays: null,
};

function texte(v: unknown, max = 200): string | null {
  const s = typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "";
  return s ? s.slice(0, max) : null;
}

/**
 * Normalise ce qui arrive d'un formulaire ou d'un fournisseur.
 *
 * Le pays est mis en ISO deux lettres majuscules et le numéro de TVA
 * débarrassé de ses espaces : c'est LE pays qui décide du taux, et
 * "Belgique", "belgium" et "BE" donneraient trois taux différents pour
 * un seul client.
 */
export function lireAcheteur(brut: unknown): Acheteur {
  const o = (brut && typeof brut === "object" ? brut : {}) as Record<string, unknown>;
  return {
    email: texte(o.email, 320),
    prenom: texte(o.prenom, 80),
    nom: texte(o.nom, 80),
    societe: texte(o.societe, 160),
    tvaNumero: normaliserNumeroTva(o.tvaNumero ?? o.tva_numero),
    adresse1: texte(o.adresse1 ?? o.adresse_1, 200),
    adresse2: texte(o.adresse2 ?? o.adresse_2, 200),
    codePostal: texte(o.codePostal ?? o.code_postal, 20),
    ville: texte(o.ville, 100),
    pays: normaliserPays(o.pays),
  };
}

/** Le nom qui s'imprime : la société d'abord, la personne sinon. */
export function nomFacture(a: Acheteur): string | null {
  if (a.societe) return a.societe;
  const complet = [a.prenom, a.nom].filter(Boolean).join(" ").trim();
  return complet || null;
}

/** Une adresse professionnelle (société OU numéro de TVA) ? */
export function estProfessionnel(a: Acheteur): boolean {
  return !!(a.societe || a.tvaNumero);
}

/**
 * CE QUI MANQUE POUR QUE LA FACTURE SOIT OPPOSABLE.
 *
 * Volontairement court : le nom, l'adresse, le pays. Le reste
 * (complément d'adresse, société, TVA) est "si concerné", exactement
 * comme Béné l'a écrit, et une facture à un particulier n'a pas à
 * réclamer un numéro de TVA qu'il n'aura jamais.
 */
export function manques(a: Acheteur): string[] {
  const m: string[] = [];
  if (!nomFacture(a)) m.push("nom");
  if (!a.adresse1) m.push("adresse");
  if (!a.codePostal || !a.ville) m.push("ville");
  if (!a.pays) m.push("pays");
  return m;
}

/** Prêt à facturer sans réserve ? */
export function acheteurComplet(a: Acheteur): boolean {
  return manques(a).length === 0;
}

/** L'adresse sur plusieurs lignes, telle qu'elle s'imprime. */
export function lignesAdresse(a: Acheteur): string[] {
  const lignes: string[] = [];
  const nom = nomFacture(a);
  if (nom) lignes.push(nom);
  // Une société ET une personne : les deux, la personne en second, parce
  // qu'une facture adressée à une société doit quand même arriver à
  // quelqu'un.
  if (a.societe) {
    const personne = [a.prenom, a.nom].filter(Boolean).join(" ").trim();
    if (personne) lignes.push(personne);
  }
  if (a.adresse1) lignes.push(a.adresse1);
  if (a.adresse2) lignes.push(a.adresse2);
  const ville = [a.codePostal, a.ville].filter(Boolean).join(" ").trim();
  if (ville) lignes.push(ville);
  if (a.pays) lignes.push(nomDuPays(a.pays));
  return lignes;
}

/**
 * Le pays en toutes lettres, dans la langue de la facture.
 *
 * `Intl.DisplayNames` connaît les 249 codes ISO : une table écrite à la
 * main en oublierait, et c'est toujours celui du client qui manque.
 */
export function nomDuPays(code: string, locale = "fr"): string {
  try {
    const dn = new Intl.DisplayNames([locale], { type: "region" });
    return dn.of(code) ?? code;
  } catch {
    return code;
  }
}

/**
 * FUSIONNE DEUX IDENTITÉS, SANS JAMAIS EFFACER.
 *
 * `nouveau` gagne CHAMP PAR CHAMP, et seulement là où il a une valeur.
 * C'est la seule règle qui marche quand plusieurs sources écrivent : le
 * formulaire de paiement Stripe, le bon de commande PayPal, le client
 * dans ses réglages, Béné sur la fiche.
 *
 * Remplacer le bloc entier ferait qu'un paiement Stripe, qui ne collecte
 * pas la société, effacerait la société saisie la semaine d'avant. Un
 * champ qu'on a perdu sans le voir est pire qu'un champ jamais rempli.
 */
export function fusionnerAcheteur(ancien: Acheteur | null, nouveau: Acheteur): Acheteur {
  const base = ancien ?? ACHETEUR_VIDE;
  const cles = Object.keys(ACHETEUR_VIDE) as (keyof Acheteur)[];
  const sortie = { ...base };
  for (const c of cles) {
    const v = nouveau[c];
    if (v !== null && v !== undefined && String(v).trim() !== "") sortie[c] = v;
  }
  return sortie;
}
