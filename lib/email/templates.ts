// lib/email/templates.ts
// Gabarits HTML des emails L'Atelier du Quiz. Table-based + styles inline pour
// passer les clients mail (Gmail, Outlook, Apple Mail). Indigo de marque
// #5D6CDB. Contenu user-visible : accents respectes, aucun tiret long.
import "server-only";

// Runtime (APP_URL) plutôt que NEXT_PUBLIC_* (inliné au build) : sinon le
// logo et les liens des emails pointent sur la valeur gravée au build
// (drame localhost:3002, 18 juin 2026).
const APP_URL = (
  process.env.APP_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://quizing.tipote.com"
).trim().replace(/\/$/, "");
const BRAND = "#5D6CDB";
const INK = "#1f2340";
const MUTED = "#6b7191";
const LOGO_URL = `${APP_URL}/quizing.png`;

/** Enveloppe commune : entete logo, carte centrale, pied de page. */
function layout(inner: string): string {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#f4f5fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${INK};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5fb;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <img src="${LOGO_URL}" alt="L'Atelier du Quiz" height="34" style="height:34px;width:auto;display:block;" />
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(31,35,64,0.08);">
              ${inner}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:24px;font-size:12px;line-height:18px;color:${MUTED};">
              Tu reçois cet email parce que tu as un accès à L'Atelier du Quiz.<br />
              Une question ? Réponds simplement à cet email.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Bouton d'action principal. */
function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;">
    <tr>
      <td align="center" style="border-radius:10px;background:${BRAND};">
        <a href="${href}" target="_blank" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">${label}</a>
      </td>
    </tr>
  </table>`;
}

/** Lien de secours (si le bouton ne marche pas). */
function fallbackLink(href: string): string {
  return `<p style="margin:20px 0 0;font-size:12px;line-height:18px;color:${MUTED};">
    Si le bouton ne fonctionne pas, copie-colle ce lien dans ton navigateur :<br />
    <a href="${href}" target="_blank" style="color:${BRAND};word-break:break-all;">${href}</a>
  </p>`;
}

export interface BuiltEmail {
  subject: string;
  html: string;
}

/**
 * Email d'accueil envoye a l'octroi d'acces.
 * - isNewAccount = true  : le lien active le compte et fait choisir un mot de passe.
 * - isNewAccount = false : le lien connecte directement a l'espace.
 */
export function welcomeEmail({
  actionUrl,
  isNewAccount,
}: {
  actionUrl: string;
  isNewAccount: boolean;
}): BuiltEmail {
  const cta = isNewAccount ? "Activer mon accès" : "Accéder à mon espace";
  const inner = `
    <h1 style="margin:0 0 16px;font-size:22px;line-height:28px;color:${INK};">Bienvenue dans L'Atelier du Quiz.</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:23px;color:${INK};">
      Ton accès est prêt. L'Atelier du Quiz, ce n'est pas une formation que tu regardes : c'est un parcours que tu fais.
    </p>
    <p style="margin:0 0 8px;font-size:15px;line-height:23px;color:${INK};">Concrètement :</p>
    <ul style="margin:0 0 20px;padding-left:20px;font-size:15px;line-height:23px;color:${INK};">
      <li>7 jours, une vidéo qui enseigne et un quiz qui te fait agir chaque jour.</li>
      <li>Un coach IA disponible à toute heure dès que tu bloques.</li>
      <li>À la fin : un quiz lead-magnet publié qui capte des leads en automatique.</li>
    </ul>
    <p style="margin:0 0 20px;font-size:15px;line-height:23px;color:${INK};">
      ${isNewAccount
        ? "Clique ci-dessous pour activer ton compte et choisir ton mot de passe."
        : "Clique ci-dessous pour rejoindre ton espace et reprendre là où tu en es."}
    </p>
    ${button(actionUrl, cta)}
    ${fallbackLink(actionUrl)}
  `;
  return {
    subject: isNewAccount
      ? "Bienvenue dans L'Atelier du Quiz, active ton accès"
      : "Ton accès L'Atelier du Quiz est prêt",
    html: layout(inner),
  };
}

/** Email de réinitialisation du mot de passe. */
export function resetPasswordEmail({ actionUrl }: { actionUrl: string }): BuiltEmail {
  const inner = `
    <h1 style="margin:0 0 16px;font-size:22px;line-height:28px;color:${INK};">Nouveau mot de passe</h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:23px;color:${INK};">
      Tu as demandé à réinitialiser ton mot de passe L'Atelier du Quiz. Clique ci-dessous pour en choisir un nouveau.
    </p>
    ${button(actionUrl, "Choisir un nouveau mot de passe")}
    <p style="margin:20px 0 0;font-size:13px;line-height:20px;color:${MUTED};">
      Si tu n'es pas à l'origine de cette demande, tu peux ignorer cet email : ton mot de passe reste inchangé.
    </p>
    ${fallbackLink(actionUrl)}
  `;
  return {
    subject: "Réinitialise ton mot de passe L'Atelier du Quiz",
    html: layout(inner),
  };
}

/** Récap hebdomadaire doux (lundi matin) : où en est l'élève + prochaine étape. */
export function weeklyRecapEmail({
  firstName,
  dayNumber,
  dayTitle,
  completed,
  total,
}: {
  firstName: string | null;
  dayNumber: number;
  dayTitle: string;
  completed: number;
  total: number;
}): BuiltEmail {
  const hello = firstName ? `Salut ${firstName},` : "Salut,";
  const dashboard = `${APP_URL}/dashboard`;
  const inner = `
    <h1 style="margin:0 0 16px;font-size:22px;line-height:28px;color:${INK};">${hello} ta semaine L'Atelier du Quiz</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:23px;color:${INK};">
      Tu as bouclé <strong>${completed} jour(s) sur ${total}</strong>. Pas de pression, juste un petit repère pour reprendre quand tu veux.
    </p>
    <p style="margin:0 0 8px;font-size:15px;line-height:23px;color:${INK};">Ta prochaine étape :</p>
    <p style="margin:0 0 20px;font-size:16px;line-height:24px;color:${INK};font-weight:600;">
      Jour ${dayNumber} : ${dayTitle}
    </p>
    ${button(dashboard, "Reprendre mon parcours")}
    <p style="margin:20px 0 0;font-size:13px;line-height:20px;color:${MUTED};">
      Un blocage ? Réponds à cet email, ou clique sur "Un blocage ?" en bas de ton jour. On lit tout, et ça nous aide à améliorer la formation.
    </p>
  `;
  return {
    subject: "Ta prochaine étape L'Atelier du Quiz t'attend",
    html: layout(inner),
  };
}

/** Alerte admin : de nouveaux élèves méritent une mise en avant. */
export function spotlightAdminEmail({
  items,
}: {
  items: { name: string; label: string }[];
}): BuiltEmail {
  const list = items
    .map((i) => `<li style="margin-bottom:6px;">${i.name} : <strong>${i.label}</strong></li>`)
    .join("");
  const inner = `
    <h1 style="margin:0 0 16px;font-size:22px;line-height:28px;color:${INK};">Nouveaux candidats à mettre en avant</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:23px;color:${INK};">
      Des élèves viennent d'atteindre un vrai cap. Un brouillon d'étude de cas est déjà prêt pour chacun, à relire et valider.
    </p>
    <ul style="margin:0 0 20px;padding-left:20px;font-size:15px;line-height:23px;color:${INK};">${list}</ul>
    ${button(`${APP_URL}/admin/spotlights`, "Voir les candidats")}
  `;
  return {
    subject: `${items.length} candidat(s) à mettre en avant (L'Atelier du Quiz)`,
    html: layout(inner),
  };
}
