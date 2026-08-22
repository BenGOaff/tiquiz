// lib/email/magicLinkEmail.ts
//
// L'ENVOI DU LIEN DE CONNEXION. Le TEXTE vit dans `magicLinkContent.ts`,
// sans `server-only`, pour qu'un test puisse le lire.

import "server-only";

import { buildMagicLinkContent } from "./magicLinkContent";
import { sendTiquizEmail } from "./tiquizSend";

export { buildMagicLinkContent };

/**
 * Envoie le lien de connexion. Rend `false` si l'envoi a échoué : la
 * personne attend devant sa boîte, l'appelant doit pouvoir réagir.
 */
export async function sendMagicLinkEmail(args: {
  email: string;
  actionLink: string;
  locale?: string | null;
}): Promise<boolean> {
  const { html, text, subject } = buildMagicLinkContent(args.actionLink, args.locale);
  return sendTiquizEmail({
    email: args.email,
    subject,
    html,
    text,
    refId: "magic-link",
    journal: "magicLinkEmail",
  });
}
