// lib/ventes/alerteVente.ts
//
// UNE VENTE ENCAISSÉE PAR NOTRE BON DE COMMANDE PRÉVIENT BÉNÉ PAR EMAIL.
//
// Béné, 11 septembre 2026 : "il me faut aussi une alerte quand je fais
// une nouvelle vente via notre système, par email."
//
// Systeme.io la prévenait de chaque vente faite sur ses tunnels. Depuis
// que le bon de commande est chez nous (Stripe et PayPal), une vente
// ouvrait l'accès, émettait la facture, commissionnait l'affilié... et
// personne ne le lui disait. Elle le découvrait dans l'admin, ou pas.
//
// -- CE MODULE EST PUR, ET IL EST LE MÊME DANS LES DEUX DÉPÔTS ----------
//
// Il décide du CONTENU (l'objet, le corps) et de rien d'autre : pas de
// Resend, pas de `process.env`, pas de `server-only`. C'est ce qui le
// rend testable, et ce qui permet de le garder identique à l'octet
// près entre Tiquiz et l'Atelier :
//
//     cmp lib/ventes/alerteVente.ts ../formaquiz/lib/ventes/alerteVente.ts
//
// L'ENVOI vit à côté, dans `lib/email/venteEncaisseeAlerte.ts`, qui
// connaît l'application, ses destinataires et son adresse d'admin.
//
// -- LA NATURE EST UN PARAMÈTRE OBLIGATOIRE ----------------------------
//
// Une première vente et une échéance mensuelle ne se lisent pas pareil
// dans une boîte de réception : la première est une nouvelle cliente,
// la seconde est une cliente qui reste. Les confondre ferait ouvrir
// chaque renouvellement comme une nouveauté. Et quand le moyen de
// paiement ne SAIT pas le dire (PayPal ne distingue pas la première
// échéance des suivantes), on le DIT au lieu de deviner : c'est la
// règle du 1er août, la mécanique est un paramètre, jamais déduite.
//
// -- AUCUN CHIFFRE N'EST RECOPIÉ -----------------------------------------
//
// Le montant est celui qui a VRAIMENT été encaissé (la session Stripe,
// la facture, la capture PayPal), jamais le prix du catalogue : une
// remise, un prorata ou un mois offert changent la somme, et un email
// qui annonce 17,00 € pour un prélèvement de 0 € ferait douter de tout
// le reste.

export type MoyenEncaissement = "stripe" | "paypal";

/**
 * Ce que l'encaissement EST, du point de vue de celle qui lit l'email.
 *
 * - `premiere`  : une nouvelle vente (achat unique, ou première échéance
 *                 d'un abonnement) ;
 * - `echeance`  : un renouvellement, la cliente reste ;
 * - `essai`     : un abonnement qui démarre par un mois offert, zéro
 *                 euro encaissé ce mois ci, une nouvelle abonnée quand
 *                 même ;
 * - `inconnue`  : le moyen de paiement ne dit pas si c'est la première
 *                 échéance ou une suivante. On le dit, on ne devine pas.
 */
export type NatureEncaissement = "premiere" | "echeance" | "essai" | "inconnue";

export interface VenteAlertee {
  /** Le nom de l'application qui a encaissé : "Tiquiz", "L'Atelier du Quiz". */
  app: string;
  moyen: MoyenEncaissement;
  nature: NatureEncaissement;
  /** L'adresse qui a payé. */
  email: string;
  /** Le nom saisi au paiement, s'il y en a un. */
  nom?: string | null;
  /** Le nom du produit tel qu'il est lu sur le bon de commande. */
  produit: string;
  /** Ce qui a VRAIMENT été encaissé, TVA comprise, en centimes. */
  montantCents: number;
  devise: string;
  /** La référence chez le moyen de paiement (session, facture, capture). */
  reference: string;
  /** Le compte vient-il d'être créé ? `null` quand on ne le sait pas. */
  compteCree: boolean | null;
  /** L'adresse de la fiche à ouvrir dans l'admin. */
  lienAdmin: string;
}

export interface ContenuAlerte {
  subject: string;
  html: string;
  texte: string;
}

/** Une espace insécable : en français, elle précède `:`. */
const NBSP = " ";

/**
 * La nature d'une facture Stripe d'abonnement.
 *
 * `billing_reason` vaut `subscription_create` sur la PREMIÈRE facture
 * d'un abonnement, `subscription_cycle` sur chaque renouvellement, et
 * `subscription_update` sur une montée de palier (le prorata). Les deux
 * derniers sont des échéances : la cliente est déjà là.
 *
 * Une première facture à ZÉRO est un mois offert : l'abonnement démarre
 * sans qu'un euro ait bougé. Ce n'est pas une vente à zéro, c'est un
 * essai, et l'email doit le dire dans ces mots.
 */
export function natureDeLaFactureStripe(
  billingReason: unknown,
  montantPayeCents: number,
): NatureEncaissement {
  const raison = String(billingReason ?? "").trim().toLowerCase();
  if (raison === "subscription_create") {
    return montantPayeCents > 0 ? "premiere" : "essai";
  }
  return "echeance";
}

/**
 * Un montant lisible, dans le format de celle qui le lit (17,00 €).
 *
 * Deux décimales TOUJOURS : c'est un montant encaissé, pas un prix
 * d'affiche, et « 17 € » à côté d'un « 5,67 € » se lit comme une
 * approximation.
 */
export function montantLisible(cents: number, devise: string): string {
  const n = Number.isFinite(cents) ? cents / 100 : 0;
  try {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: String(devise || "eur").toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    // Une devise illisible ne doit pas faire perdre l'alerte.
    return `${n.toFixed(2).replace(".", ",")} ${String(devise || "").toUpperCase()}`.trim();
  }
}

function echappe(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const MOYENS: Record<MoyenEncaissement, string> = {
  stripe: "carte bancaire (Stripe)",
  paypal: "PayPal",
};

function titreSelonNature(v: VenteAlertee, montant: string): string {
  switch (v.nature) {
    case "premiere":
      return `Nouvelle vente ${v.app}${NBSP}: ${montant}, ${v.produit}`;
    case "echeance":
      return `Échéance encaissée ${v.app}${NBSP}: ${montant}, ${v.produit}`;
    case "essai":
      return `Nouvel essai ${v.app}${NBSP}: ${v.produit}, mois offert`;
    case "inconnue":
      return `Encaissement ${v.app}${NBSP}: ${montant}, ${v.produit}`;
  }
}

function phraseSelonNature(v: VenteAlertee): string {
  switch (v.nature) {
    case "premiere":
      return "C'est une nouvelle vente.";
    case "echeance":
      return "C'est un renouvellement, la personne reste abonnée.";
    case "essai":
      return "L'abonnement démarre par un mois offert, rien n'a été prélevé ce mois ci. La première vraie échéance arrivera dans un mois.";
    case "inconnue":
      return "PayPal ne dit pas si c'est la première échéance ou un renouvellement.";
  }
}

function phraseCompte(compteCree: boolean | null): string | null {
  if (compteCree === true) return "Le compte vient d'être créé.";
  if (compteCree === false) return "Le compte existait déjà.";
  return null;
}

/**
 * L'objet et le corps de l'alerte.
 *
 * Tout ce qui vient de l'extérieur (le nom saisi au paiement, l'adresse,
 * le libellé du produit) est ÉCHAPPÉ : un nom avec un `<` casserait le
 * message, et un `<script>` volontaire deviendrait une injection dans la
 * boîte de Béné.
 */
export function contenuAlerteVente(v: VenteAlertee): ContenuAlerte {
  const montant = montantLisible(v.montantCents, v.devise);
  const qui = v.nom?.trim() ? `${v.nom.trim()} (${v.email})` : v.email;
  const compte = phraseCompte(v.compteCree);

  const lignes: string[] = [
    `Qui${NBSP}: ${qui}`,
    `Produit${NBSP}: ${v.produit}`,
    `Montant encaissé${NBSP}: ${montant}`,
    `Moyen de paiement${NBSP}: ${MOYENS[v.moyen]}`,
    `Référence${NBSP}: ${v.reference}`,
  ];

  const subject = titreSelonNature(v, montant);
  const phrases = [phraseSelonNature(v), compte].filter((p): p is string => Boolean(p));

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2340;font-size:15px;line-height:23px;">
      <h1 style="font-size:20px;margin:0 0 16px;">${echappe(subject)}</h1>
      ${phrases.map((p) => `<p style="margin:0 0 12px;">${echappe(p)}</p>`).join("\n      ")}
      <ul style="margin:12px 0 16px;padding-left:20px;">
        ${lignes.map((l) => `<li>${echappe(l)}</li>`).join("\n        ")}
      </ul>
      <p style="margin:0;"><a href="${echappe(v.lienAdmin)}" style="color:#5D6CDB;">Ouvrir sa fiche dans l'admin</a></p>
    </div>`;

  const texte = [subject, "", ...phrases, "", ...lignes.map((l) => `- ${l}`), "", v.lienAdmin].join("\n");

  return { subject, html, texte };
}
