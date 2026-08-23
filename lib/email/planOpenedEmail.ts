// lib/email/planOpenedEmail.ts
//
// L'ENVOI DE LA CONFIRMATION D'ACHAT. Le TEXTE vit dans
// `planOpenedContent.ts`, sans `server-only`, pour qu'un test le lise.

import "server-only";

import { buildPlanOpenedContent, type PlanOpenedSituation } from "./planOpenedContent";
import { sendTiquizEmail } from "./tiquizSend";

export { buildPlanOpenedContent };
export type { PlanOpenedSituation };

/**
 * Confirme l'achat et donne le lien d'entree. Rend `false` si l'envoi a
 * echoue : la cliente vient de payer et attend devant sa boite,
 * l'appelant doit pouvoir le journaliser.
 */
export async function sendPlanOpenedEmail(args: {
  email: string;
  situation: PlanOpenedSituation;
  planLabel: string;
  actionLink: string;
  locale?: string | null;
}): Promise<boolean> {
  const { html, text, subject } = buildPlanOpenedContent({
    situation: args.situation,
    planLabel: args.planLabel,
    actionLink: args.actionLink,
    locale: args.locale,
  });
  return sendTiquizEmail({
    email: args.email,
    subject,
    html,
    text,
    refId: "plan-opened",
    journal: "planOpenedEmail",
  });
}
