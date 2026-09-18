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

// -- ET ELLE DOIT SAVOIR SI UN AFFILIÉ EST DERRIÈRE (Béné, 18 septembre) -
//
// "Dans l'email que je reçois, je voudrais savoir en plus si la vente
// est liée à un affilié, et si oui lequel."
//
// La demande arrive au bon moment : depuis le 17 septembre, le webhook
// CONNAÎT la réponse au moment où il envoie cet email (il vient
// d'appeler le registre, et il en garde le verdict). Avant, personne ne
// le savait à cet endroit là.
//
// **`affiliation` est un paramètre OBLIGATOIRE**, comme `nature`. Un
// appelant qui se tait laisserait l'email muet sur la question, c'est à
// dire exactement l'état qu'elle vient de faire corriger, et rien ne le
// dirait. Avec un champ obligatoire, le compilateur refuse le silence :
// `"inconnu"` existe pour le dire à voix haute.

export type MoyenEncaissement = "stripe" | "paypal";

/**
 * CE QU'IL FAUT DIRE DE L'AFFILIÉ, DANS UNE BOÎTE DE RÉCEPTION.
 *
 * Volontairement plus grossier que les statuts du registre : Béné lit
 * cet email sur son téléphone, et ce qu'elle a besoin de savoir en
 * trois secondes, c'est « quelqu'un est payé, personne n'est payé, ou
 * il faut que je regarde ». Les huit statuts du registre se replient
 * donc sur ces sept états, et la traduction est EXHAUSTIVE chez
 * l'appelant : un statut nouveau fait rougir le compilateur au lieu de
 * tomber dans un repli silencieux.
 *
 * - `credite`     : un affilié a une commission sur cette vente ;
 * - `aucun`       : le registre a regardé, il n'y a pas d'affilié. Une
 *                   vraie réponse, et la plus fréquente ;
 * - `ailleurs`    : vente hors de notre bon de commande, c'est
 *                   Systeme.io qui règle la commission ;
 * - `rien_du`     : zéro euro encaissé (mois offert), rien n'était dû ;
 * - `en_cours`    : l'appel au registre n'est pas passé, il sera rejoué.
 *                   Rien n'est perdu, mais ce n'est pas fini ;
 * - `a_regarder`  : aucune commission, et ça ne devrait pas être le cas.
 *                   C'est le seul état qui demande une action ;
 * - `inconnu`     : on ne sait pas. Jamais un repli de confort : il se
 *                   passe quand on n'a VRAIMENT pas la réponse.
 */
export type EtatAffiliationAlerte =
  | "credite"
  | "aucun"
  | "ailleurs"
  | "rien_du"
  | "en_cours"
  | "a_regarder"
  | "inconnu";

export interface AffiliationAlertee {
  etat: EtatAffiliationAlerte;
  /**
   * QUI est crédité. Le nom public de l'affilié quand le registre l'a
   * nommé, à défaut son identifiant. `null` quand personne ne l'est.
   */
  affilie?: string | null;
  /**
   * Le CODE du lien utilisé (`?ref=greg`), quand la vente en portait un.
   *
   * Il vaut la peine d'être dit même quand la commission n'a pas été
   * créée : un code présent avec un état `a_regarder` désigne tout de
   * suite le problème (le code n'est pas au registre), alors qu'un état
   * `a_regarder` sans code dit l'inverse (personne n'a cliqué).
   */
  code?: string | null;
  /** La commission créée, en centimes. `null` quand il n'y en a pas. */
  commissionCents?: number | null;
  /**
   * Ce que l'appelant a compris, en clair, quand ça explique un état qui
   * n'a rien payé. Repris tel quel et ÉCHAPPÉ : c'est un détail
   * technique, pas une phrase à elle.
   */
  detail?: string | null;
}

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
  /**
   * L'AFFILIÉ DE CETTE VENTE. Obligatoire : voir l'en tête du fichier.
   *
   * Un appelant qui n'a pas encore la réponse passe
   * `{ etat: "inconnu" }`, et l'email le dit. Le silence, lui, n'est
   * plus une option.
   */
  affiliation: AffiliationAlertee;
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

/**
 * LA LIGNE « AFFILIÉ » DE L'EMAIL.
 *
 * Elle est TOUJOURS écrite, même quand il n'y a pas d'affilié : une
 * ligne absente se lit "on n'en a pas parlé", et c'est précisément ce
 * qu'elle a demandé à ne plus avoir. Un "Aucun affilié" explicite est
 * une information ; un silence n'en est pas une.
 */
export function ligneAffiliation(a: AffiliationAlertee): string {
  const qui = a.affilie?.trim() || null;
  const code = a.code?.trim() || null;
  const montant =
    Number(a.commissionCents) > 0 ? montantLisible(Number(a.commissionCents), "eur") : null;
  const viaLeCode = code ? ` (lien ${code})` : "";

  switch (a.etat) {
    case "credite":
      return (
        `Affilié${NBSP}: ${qui ?? "crédité"}${viaLeCode}` +
        (montant ? `, ${montant} de commission` : ", commission créée")
      );
    case "aucun":
      // On dit "vérifié" : sans ce mot, la phrase se lit comme un doute,
      // et elle ferait aller regarder pour rien.
      return `Affilié${NBSP}: aucun, vérifié auprès du registre`;
    case "ailleurs":
      return `Affilié${NBSP}: commission réglée par Systeme.io, rien à faire`;
    case "rien_du":
      return `Affilié${NBSP}: rien à commissionner sur cet encaissement`;
    case "en_cours":
      return (
        `Affilié${NBSP}: commission pas encore créée${viaLeCode}, elle sera rejouée` +
        (a.detail ? ` (${a.detail})` : "")
      );
    case "a_regarder":
      return (
        `Affilié${NBSP}: AUCUNE COMMISSION CRÉÉE${viaLeCode}, à vérifier` +
        (a.detail ? ` (${a.detail})` : "")
      );
    case "inconnu":
      return `Affilié${NBSP}: je ne sais pas si quelqu'un a été crédité`;
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
    ligneAffiliation(v.affiliation),
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
