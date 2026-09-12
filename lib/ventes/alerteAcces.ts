// lib/ventes/alerteAcces.ts
//
// UN PAIEMENT QUI N'OUVRE PAS L'ACCÈS, OU QUI L'OUVRE À MOITIÉ, PRÉVIENT
// BÉNÉ PAR EMAIL.
//
// Audit du 11 septembre 2026, suite. La règle du 7 août dit « il a payé
// le client, il doit recevoir ses accès, point barre ». Le code la tient
// (un octroi raté répond 502, le fournisseur réessaie) et il se tait :
// quand Stripe ou PayPal ont fini de réessayer, personne ne sait qu'une
// personne a payé et attend devant une porte fermée. Et quand l'accès
// est ouvert mais que l'email de confirmation n'est pas parti, ou que le
// tag Systeme.io n'a pas été posé, la personne a son accès sans le
// savoir, et elle sort de toutes les séquences email. Les deux ne
// vivaient que dans `pm2 logs`.
//
// -- CE MODULE EST PUR, ET IL EST LE MÊME DANS LES DEUX DÉPÔTS ----------
//
//     cmp lib/ventes/alerteAcces.ts ../formaquiz/lib/ventes/alerteAcces.ts
//
// Il décide de DEUX choses : faut-il alerter, et quoi dire. L'envoi vit
// dans `lib/email/accesAlerte.ts` de chaque dépôt.
//
// -- L'ÉTAT DE L'OCTROI EST DÉCRIT, JAMAIS DEVINÉ --------------------
//
// `null` veut dire « on ne sait pas » (l'Atelier ne dit pas si son email
// est parti), et on n'alerte pas sur un doute : on alerte sur un
// `false`, c'est à dire sur un échec constaté. Un email d'alerte qui
// crie pour rien finit dans un filtre, et emporte les vrais avec lui.

export type MoyenPaiement = "stripe" | "paypal";

export type EtatOctroi =
  /** Le plan n'a PAS été ouvert : quelqu'un a payé et n'a rien. */
  | { ok: false; raison: string }
  /** Ouvert. Chaque suite dit si elle est passée, ou qu'on ne sait pas. */
  | {
      ok: true;
      compteCree: boolean | null;
      emailAccesEnvoye: boolean | null;
      tagsPoses: boolean | null;
    };

export interface AccesAlerte {
  app: string;
  moyen: MoyenPaiement;
  email: string;
  produit: string;
  reference: string;
  octroi: EtatOctroi;
  lienAdmin: string;
}

export interface ContenuAlerteAcces {
  subject: string;
  html: string;
  texte: string;
}

/** Une espace insécable : en français, elle précède `:`. */
const NBSP = " ";

/**
 * FAUT-IL ALERTER ?
 *
 * Oui sur un octroi raté. Oui sur une suite CONSTATÉE ratée. Non sur un
 * octroi complet, et non sur une suite qu'on ne sait pas lire.
 */
export function alerteAccesNecessaire(octroi: EtatOctroi): boolean {
  if (!octroi.ok) return true;
  return octroi.emailAccesEnvoye === false || octroi.tagsPoses === false;
}

function echappe(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const MOYENS: Record<MoyenPaiement, string> = {
  stripe: "carte bancaire (Stripe)",
  paypal: "PayPal",
};

/**
 * L'objet et le corps. Ce qui vient de l'extérieur (l'adresse, le
 * libellé, la raison technique) est ÉCHAPPÉ.
 *
 * Chaque cas dit CE QU'IL FAUT FAIRE, pas seulement ce qui s'est passé :
 * un email d'alerte qu'on lit sans savoir quoi faire est un email qu'on
 * remet à plus tard.
 */
export function contenuAlerteAcces(a: AccesAlerte): ContenuAlerteAcces {
  const o = a.octroi;
  const subject = o.ok
    ? `Accès ouvert mais incomplet ${a.app}${NBSP}: ${a.email}`
    : `PAIEMENT SANS ACCÈS ${a.app}${NBSP}: ${a.email}`;

  const phrases: string[] = [];
  const aFaire: string[] = [];
  if (!o.ok) {
    phrases.push(
      `Le paiement est encaissé et le plan n'a PAS été ouvert (raison technique${NBSP}: ${o.raison}).`,
      "Le fournisseur va réessayer tout seul pendant quelques jours, et cet email reviendra à chaque échec.",
    );
    aFaire.push(
      "Si cet email revient plus de deux fois, ouvre l'accès à la main depuis sa fiche dans l'admin.",
      "Regarde pm2 logs pour la cause : la ligne commence par [grantPlan] ou [grantAccess].",
    );
  } else {
    phrases.push("Le plan est ouvert. Ce qui devait suivre n'est pas passé entièrement.");
    if (o.emailAccesEnvoye === false) {
      phrases.push("L'email de confirmation avec le lien d'entrée n'est PAS parti.");
      aFaire.push(
        "Renvoie-lui un lien de connexion depuis sa fiche dans l'admin, sinon la personne a payé et ne sait pas qu'elle peut entrer.",
      );
    }
    if (o.tagsPoses === false) {
      phrases.push("Le tag Systeme.io n'a PAS été posé.");
      aFaire.push(
        "Pose le tag à la main dans Systeme.io, sinon la personne ne reçoit aucune de tes séquences.",
      );
    }
    if (o.compteCree === true) phrases.push("Le compte vient d'être créé par cet achat.");
  }

  const lignes = [
    `Qui${NBSP}: ${a.email}`,
    `Produit${NBSP}: ${a.produit}`,
    `Moyen de paiement${NBSP}: ${MOYENS[a.moyen]}`,
    `Référence${NBSP}: ${a.reference}`,
  ];

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2340;font-size:15px;line-height:23px;">
      <h1 style="font-size:20px;margin:0 0 16px;">${echappe(subject)}</h1>
      ${phrases.map((p) => `<p style="margin:0 0 12px;">${echappe(p)}</p>`).join("\n      ")}
      <p style="margin:12px 0 4px;font-weight:600;">À faire${NBSP}:</p>
      <ul style="margin:0 0 16px;padding-left:20px;">
        ${aFaire.map((l) => `<li>${echappe(l)}</li>`).join("\n        ")}
      </ul>
      <ul style="margin:12px 0 16px;padding-left:20px;">
        ${lignes.map((l) => `<li>${echappe(l)}</li>`).join("\n        ")}
      </ul>
      <p style="margin:0;"><a href="${echappe(a.lienAdmin)}" style="color:#5D6CDB;">Ouvrir sa fiche dans l'admin</a></p>
    </div>`;

  const texte = [
    subject,
    "",
    ...phrases,
    "",
    `À faire${NBSP}:`,
    ...aFaire.map((l) => `- ${l}`),
    "",
    ...lignes.map((l) => `- ${l}`),
    "",
    a.lienAdmin,
  ].join("\n");

  return { subject, html, texte };
}
