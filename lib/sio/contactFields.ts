// lib/sio/contactFields.ts
//
// CE QU'ON ÉCRIT DANS LA FICHE CONTACT DE SYSTEME.IO.
//
// -- POURQUOI CE FICHIER EXISTE (25 août 2026) -------------------------
//
// Parce que `poserTagAchat` échouait quand le contact N'EXISTAIT PAS
// chez Systeme.io, et que c'est le cas NORMAL de quelqu'un qui achète
// sur notre bon de commande sans jamais toucher un tunnel. Le code le
// disait déjà en commentaire : "c'est une personne qui sortira de ses
// séquences". Pas de bienvenue, pas de relance, pas de segment, et rien
// pour le signaler puisque l'accès s'ouvre normalement.
//
// Comme les emails restent chez Systeme.io (décision Béné), un client
// qui n'y existe pas est un client injoignable. Le problème grossissait
// à chaque vente prise chez nous.
//
// -- LES SLUGS SONT RELEVÉS, PAS DEVINÉS -------------------------------
//
// Lus dans son compte le 25 août 2026 (`GET /contact_fields`). Le piège
// est immédiat : le nom de famille s'appelle **`surname`**, pas
// `last_name`. Un slug inventé est accepté par l'API et ignoré : le
// champ resterait vide pour toujours, sans erreur, et personne ne le
// verrait avant de lire un email adressé à "Bonjour {surname}".
//
// Les champs de FACTURATION y sont aussi (`company_name`, `tax_number`,
// `street_address`, `postcode`, `city`, `country`) : puisqu'on les
// collecte maintenant pour les factures, autant qu'ils servent aussi à
// ses emails. C'est de la donnée qu'elle avait déjà, jamais transmise.

import type { Acheteur } from "@/lib/facture/identite";

/** Un champ de la fiche contact, tel que l'API l'attend. */
export interface ChampContact {
  slug: string;
  value: string;
}

/**
 * Les slugs RELEVÉS dans le compte de Béné, le 25 août 2026.
 *
 * Ne pas en ajouter au flair : un slug inconnu est accepté et ignoré.
 * Pour en ajouter un, le relever d'abord (`GET /contact_fields`).
 */
export const SLUGS = {
  prenom: "first_name",
  nom: "surname",
  societe: "company_name",
  tva: "tax_number",
  adresse: "street_address",
  codePostal: "postcode",
  ville: "city",
  pays: "country",
} as const;

/**
 * Les langues que Systeme.io accepte sur un contact.
 *
 * Relevé le 25 août 2026. `pt-BR` n'y est PAS : on retombe sur `pt`.
 * Envoyer une valeur hors de cette liste fait refuser la création
 * entière, donc on n'envoie rien plutôt qu'une valeur au hasard : un
 * contact sans langue reçoit les emails, un contact non créé ne reçoit
 * rien.
 */
export const LOCALES_SIO: readonly string[] = [
  "en", "fr", "es", "it", "pt", "de", "nl", "ru", "jp", "tr", "ar", "zh",
  "sv", "ro", "cs", "hu", "sk", "dk", "id", "pl", "el", "sr", "hi", "no",
  "th", "sq", "sl", "ua",
];

/** La langue du contact, ou `null` si on ne sait pas la traduire. */
export function localeSio(locale: string | null | undefined): string | null {
  const brut = String(locale ?? "").trim().toLowerCase();
  if (!brut) return null;
  if (LOCALES_SIO.includes(brut)) return brut;
  // `pt-BR` -> `pt`, `fr-CA` -> `fr`. Le repli régional avant l'abandon.
  const base = brut.split("-")[0];
  return LOCALES_SIO.includes(base) ? base : null;
}

/**
 * Les champs à écrire, à partir de ce qu'on sait de l'acheteur.
 *
 * **On n'envoie JAMAIS un champ vide.** Systeme.io traite une chaîne
 * vide comme une valeur : écraser un prénom déjà renseigné par du vide
 * ferait perdre une donnée qu'elle a peut-être saisie à la main, et ça
 * se verrait dans ses emails avant de se voir ici.
 */
export function champsContact(acheteur: Acheteur | null | undefined): ChampContact[] {
  const a = acheteur;
  if (!a) return [];
  const paires: [string, string | null][] = [
    [SLUGS.prenom, a.prenom],
    [SLUGS.nom, a.nom],
    [SLUGS.societe, a.societe],
    [SLUGS.tva, a.tvaNumero],
    [SLUGS.adresse, a.adresse1],
    [SLUGS.codePostal, a.codePostal],
    [SLUGS.ville, a.ville],
    // ISO 3166 deux lettres : c'est ce que le champ `country` attend.
    // Notre `Acheteur.pays` est déjà normalisé comme ça.
    [SLUGS.pays, a.pays],
  ];
  return paires
    .filter((p): p is [string, string] => typeof p[1] === "string" && p[1].trim() !== "")
    .map(([slug, value]) => ({ slug, value: value.trim() }));
}

/** Le corps de la création d'un contact. */
export interface CorpsCreationContact {
  email: string;
  locale?: string;
  fields?: ChampContact[];
}

/**
 * Construit le corps, ou rend `null` si l'adresse ne tient pas debout.
 *
 * Une adresse invalide créerait un contact fantôme dans sa liste, qui
 * ferait rebondir tous ses envois et abîmerait sa délivrabilité. Mieux
 * vaut ne pas créer.
 */
export function corpsCreationContact(args: {
  email: string;
  locale?: string | null;
  acheteur?: Acheteur | null;
}): CorpsCreationContact | null {
  const email = String(args.email ?? "").trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  const corps: CorpsCreationContact = { email };
  const langue = localeSio(args.locale);
  if (langue) corps.locale = langue;
  const champs = champsContact(args.acheteur);
  if (champs.length > 0) corps.fields = champs;
  return corps;
}
