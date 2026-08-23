// lib/facture/stripeAcheteur.ts
//
// CE QUE STRIPE A DÉJÀ COLLECTÉ, RÉCUPÉRÉ AU LIEU D'ÊTRE REDEMANDÉ.
//
// Le bon de commande carte exige l'adresse (`billing_address_collection:
// "required"`) et propose la case entreprise (`tax_id_collection`).
// Cette adresse est donc DÉJÀ saisie, correcte, et validée par Stripe.
// Ne pas la reprendre voudrait dire : afficher un formulaire vide à
// quelqu'un qui vient de le remplir, et une fiche client sans adresse
// alors qu'elle figure sur la facture Stripe. Les deux donnent
// l'impression que l'app a perdu quelque chose.
//
// Pur et testé : c'est de la lecture de payload, et la leçon du 7 août
// (drame Ivan) est de ne jamais raisonner sur la forme SUPPOSÉE d'un
// payload. Si Stripe change la sienne, un test rougit.

import { ACHETEUR_VIDE, lireAcheteur, type Acheteur } from "@/lib/facture/identite";

/** Le bloc `customer_details` d'une session Stripe, réduit à l'utile. */
export interface DetailsStripe {
  email?: string | null;
  name?: string | null;
  address?: {
    line1?: string | null;
    line2?: string | null;
    postal_code?: string | null;
    city?: string | null;
    country?: string | null;
  } | null;
  tax_ids?: { type?: string | null; value?: string | null }[] | null;
}

/**
 * Découpe "Marie Dupont" en prénom + nom.
 *
 * Stripe ne collecte qu'UN champ nom, donc il faut bien couper quelque
 * part. On coupe au PREMIER espace : "Jean Pierre Martin" donne
 * "Jean" + "Pierre Martin", ce qui est faux pour les prénoms composés
 * mais recolle exactement à l'identique sur la facture (elle imprime
 * "prénom nom"). Couper au dernier espace donnerait "Jean Pierre" +
 * "Martin", aussi arbitraire, et casserait les noms composés à la place.
 */
export function couperNom(complet: string | null | undefined): { prenom: string | null; nom: string | null } {
  const s = String(complet ?? "").trim().replace(/\s+/g, " ");
  if (!s) return { prenom: null, nom: null };
  const i = s.indexOf(" ");
  if (i < 0) return { prenom: s, nom: null };
  return { prenom: s.slice(0, i), nom: s.slice(i + 1) };
}

/**
 * L'acheteur, tel que Stripe l'a recueilli.
 *
 * `tax_ids` peut contenir plusieurs entrées (TVA européenne, ABN
 * australien...). On ne garde que le numéro de TVA intracommunautaire :
 * c'est le seul qui change quelque chose au régime de TVA, et prendre
 * "le premier de la liste" ferait passer un identifiant australien pour
 * un numéro de TVA européen.
 */
export function acheteurDepuisStripe(details: DetailsStripe | null | undefined): Acheteur {
  if (!details) return ACHETEUR_VIDE;
  const { prenom, nom } = couperNom(details.name);
  const tva = (details.tax_ids ?? []).find((t) => (t?.type ?? "") === "eu_vat")?.value ?? null;
  return lireAcheteur({
    email: details.email,
    prenom,
    nom,
    tvaNumero: tva,
    adresse1: details.address?.line1,
    adresse2: details.address?.line2,
    codePostal: details.address?.postal_code,
    ville: details.address?.city,
    pays: details.address?.country,
  });
}
