// lib/email/tiquizShell.ts
//
// L'ALLURE D'UN EMAIL TIQUIZ, ÉCRITE UNE SEULE FOIS.
//
// -- POURQUOI CE FICHIER EXISTE (22 août 2026) -------------------------
//
// Béné : "je demande un lien magique ou une réinitialisation de mdp sur
// Tiquiz et je reçois les trucs Tipote, c'est pas pro du tout."
//
// Elle avait raison, et la cause n'était pas une faute de frappe : le
// mot de passe oublié avait été refait en email maison le 31 juillet, le
// lien magique était resté sur le template de Supabase. **Une moitié
// corrigée**, exactement comme le partage du résultat (7 août) et le
// retour de l'Atelier (3 août). L'utilisatrice, elle, ne voit pas deux
// mécaniques : elle voit un produit qui se présente sous deux noms.
//
// D'où ce gabarit commun. Le prochain email d'authentification n'aura
// pas à recopier un cadre : il n'y en a qu'un, et il dit Tiquiz.
//
// -- CE FICHIER NE FAIT QUE RENDRE -------------------------------------
//
// Aucun `server-only` ici, et c'est voulu : un module marqué ainsi est
// hors de portée du runner de tests. Un texte qui part sous le nom de
// Béné et qu'aucun test ne peut lire est exactement ce qui dérive.
// L'ENVOI, lui, vit dans `tiquizSend.ts` et reste server-only.
//
// -- CE QUI RESTE HORS DE PORTÉE ---------------------------------------
//
// Les emails que SUPABASE envoie lui même (confirmation d'inscription)
// utilisent SES templates, configurés dans son tableau de bord. Aucun
// code ne peut les changer. La seule parade est de ne plus lui confier
// d'envoi : c'est ce que font `forgot-password` et `magic-link`, qui
// génèrent le lien et l'envoient eux mêmes.

/** Les phrases d'un email. Traduites par l'appelant, jamais ici. */
export interface TiquizEmailCopy {
  subject: string;
  heading: string;
  intro: string;
  cta: string;
  /** La phrase "si ce n'est pas toi, ignore". */
  ignore: string;
  linkFallback: string;
  footer: string;
}

/**
 * Le cadre Tiquiz, avec son bandeau, son bouton et son pied de page.
 *
 * Le lien est répété en toutes lettres sous le bouton : beaucoup de
 * messageries d'entreprise réécrivent ou cassent les boutons, et sans
 * cette ligne l'email devient un cul-de-sac.
 */
export function renderTiquizEmail(
  actionLink: string,
  copy: TiquizEmailCopy,
): { html: string; text: string } {
  const html = `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#f6f7fb;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2430;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7fb;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(31,36,48,0.08);">
        <tr><td style="background:linear-gradient(135deg,#0ea5c9,#20BBE6);padding:28px 32px;">
          <div style="color:#ffffff;font-size:13px;letter-spacing:.08em;text-transform:uppercase;opacity:.85;">Tiquiz</div>
          <div style="color:#ffffff;font-size:22px;font-weight:700;margin-top:6px;">${copy.heading}</div>
        </td></tr>
        <tr><td style="padding:28px 32px;">
          <p style="margin:0 0 20px;font-size:15px;line-height:1.6;">${copy.intro}</p>
          <div style="text-align:center;margin:24px 0 8px;">
            <a href="${actionLink}" style="display:inline-block;background:#20BBE6;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 26px;border-radius:9999px;">${copy.cta}</a>
          </div>
          <p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#5b6270;">${copy.ignore}</p>
          <p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#8a8f9c;">${copy.linkFallback}<br />${actionLink}</p>
        </td></tr>
        <tr><td style="padding:18px 32px;border-top:1px solid #eef0f4;">
          <p style="margin:0;font-size:12px;color:#8a8f9c;">${copy.footer}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    copy.heading,
    "",
    copy.intro,
    "",
    `${copy.cta} : ${actionLink}`,
    "",
    copy.ignore,
    "",
    copy.footer,
  ].join("\n");

  return { html, text };
}

/**
 * LE MÊME CADRE, POUR UN MESSAGE SANS BOUTON.
 *
 * Une réponse du support n'est pas une action à faire : c'est du texte à
 * lire. Le gabarit à bouton l'aurait obligée à inventer un CTA, et un
 * bouton qui ne mène nulle part est pire qu'une absence de bouton.
 *
 * `paragraphes` est du TEXTE BRUT, échappé ici. Ce qu'une cliente a
 * écrit finit dans cet email : le laisser passer en HTML serait une
 * injection dans la boîte de sa correspondante.
 */
export function renderTiquizMessage(copy: {
  subject: string;
  heading: string;
  paragraphes: readonly string[];
  footer: string;
}): { html: string; text: string } {
  const corps = copy.paragraphes
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;white-space:pre-wrap;">${echapper(
          p,
        )}</p>`,
    )
    .join("");

  const html = `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#f6f7fb;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2430;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7fb;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(31,36,48,0.08);">
        <tr><td style="background:linear-gradient(135deg,#0ea5c9,#20BBE6);padding:28px 32px;">
          <div style="color:#ffffff;font-size:13px;letter-spacing:.08em;text-transform:uppercase;opacity:.85;">Tiquiz</div>
          <div style="color:#ffffff;font-size:22px;font-weight:700;margin-top:6px;">${echapper(copy.heading)}</div>
        </td></tr>
        <tr><td style="padding:28px 32px;">${corps}</td></tr>
        <tr><td style="padding:18px 32px;border-top:1px solid #eef0f4;">
          <p style="margin:0;font-size:12px;color:#8a8f9c;">${echapper(copy.footer)}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [copy.heading, "", ...copy.paragraphes, "", copy.footer].join("\n");
  return { html, text };
}

/**
 * Échappe ce qui vient d'un humain avant de l'écrire dans du HTML.
 *
 * Ce que la cliente a écrit est repris dans l'email de réponse : sans
 * ça, un `<` mal placé casse le message, et un `<script>` volontaire
 * devient une injection dans la boîte de quelqu'un d'autre.
 */
function echapper(v: string): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * L'expéditeur : **Tiquiz**, jamais Tipote.
 *
 * C'est la ligne que l'utilisatrice lit en premier dans sa boîte, avant
 * même d'ouvrir. Un email de Tiquiz signé Tipote a l'air d'une erreur,
 * au mieux, et d'une tentative d'hameçonnage au pire.
 *
 * L'ADRESSE d'envoi, elle, reste `hello@tipote.com` : c'est le domaine
 * vérifié chez Resend, et en changer sans l'avoir vérifié ferait tomber
 * tous les emails en spam. Le nom affiché suffit à lever l'ambiguïté.
 */
export function tiquizFrom(
  // Type LARGE, pas `NodeJS.ProcessEnv` : celui-la exige NODE_ENV, donc
  // un test ne peut pas lui passer deux cles sans une assertion. Et une
  // assertion posee pour faire taire le compilateur, c'est exactement ce
  // qui a cache le drame de l'import PDF (7 aout).
  env: Record<string, string | undefined> = process.env,
): string {
  const adresse =
    env.SUPPORT_FROM_EMAIL?.trim() || env.RESELLER_FROM_EMAIL?.trim() || "hello@tipote.com";
  return `Tiquiz <${adresse}>`;
}

/** Choisit les phrases : locale exacte, puis sa racine, puis le français. */
export function pickCopy<T>(table: Record<string, T>, locale?: string | null): T {
  const l = (locale ?? "").trim();
  return table[l] ?? table[l.split("-")[0]] ?? table.fr;
}
