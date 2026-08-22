// lib/email/supportReplyContent.ts
//
// LA RÉPONSE DU SUPPORT, ÉCRITE PAR NOUS, SIGNÉE TIQUIZ.
//
// Pas de `server-only` ici : c'est le TEXTE, et un test doit pouvoir le
// lire. L'envoi vit dans `supportReplyEmail.ts`. La leçon a coûté deux
// allers-retours ce mois ci, sur l'email de départ puis sur les emails
// d'authentification : un module `server-only` est invisible pour le
// runner de tests, donc non testé.
//
// -- POURQUOI ON RAPPELLE SA QUESTION ----------------------------------
//
// Une réponse qui arrive trois jours plus tard, seule, oblige la
// personne à retrouver ce qu'elle avait demandé. Son message est donc
// repris en dessous, en citation. C'est ce que fait n'importe quel
// support sérieux, et ça coûte quatre lignes.

import { pickCopy, renderTiquizMessage } from "./tiquizShell";

interface Copy {
  subject: (sujet: string) => string;
  heading: string;
  rappel: string;
  footer: string;
}

/**
 * Les 7 langues de l'interface.
 *
 * Une cliente qui travaille en espagnol reçoit une réponse en espagnol,
 * même si Béné l'a écrite en français : le CADRE est traduit, le
 * message reste dans la langue de Béné. Traduire son texte serait
 * mentir sur ce qu'elle a écrit.
 */
const COPIES: Record<string, Copy> = {
  fr: {
    subject: (s) => `Réponse à ta demande : ${s}`,
    heading: "Voici ma réponse",
    rappel: "Ta demande :",
    footer: "Tu peux répondre directement à cet email, il me revient.",
  },
  en: {
    subject: (s) => `Reply to your request: ${s}`,
    heading: "Here is my answer",
    rappel: "Your message:",
    footer: "You can reply directly to this email, it comes back to me.",
  },
  es: {
    subject: (s) => `Respuesta a tu solicitud: ${s}`,
    heading: "Aquí está mi respuesta",
    rappel: "Tu mensaje:",
    footer: "Puedes responder directamente a este correo, me llega a mí.",
  },
  it: {
    subject: (s) => `Risposta alla tua richiesta: ${s}`,
    heading: "Ecco la mia risposta",
    rappel: "Il tuo messaggio:",
    footer: "Puoi rispondere direttamente a questa email, mi arriva.",
  },
  de: {
    subject: (s) => `Antwort auf deine Anfrage: ${s}`,
    heading: "Hier ist meine Antwort",
    rappel: "Deine Nachricht:",
    footer: "Du kannst direkt auf diese E-Mail antworten, sie kommt bei mir an.",
  },
  pt: {
    subject: (s) => `Resposta ao teu pedido: ${s}`,
    heading: "Aqui está a minha resposta",
    rappel: "A tua mensagem:",
    footer: "Podes responder diretamente a este email, chega até mim.",
  },
  nl: {
    subject: (s) => `Antwoord op je vraag: ${s}`,
    heading: "Hier is mijn antwoord",
    rappel: "Jouw bericht:",
    footer: "Je kunt rechtstreeks op deze e-mail antwoorden, hij komt bij mij aan.",
  },
};

/** Le sujet affiché quand la personne n'en a pas mis. */
const SANS_SUJET: Record<string, string> = {
  fr: "ta question",
  en: "your question",
  es: "tu pregunta",
  it: "la tua domanda",
  de: "deine Frage",
  pt: "a tua pergunta",
  nl: "je vraag",
};

export function buildSupportReplyContent(args: {
  /** Ce que Béné a écrit. */
  reponse: string;
  /** Ce que la personne avait demandé. */
  question: string;
  sujet?: string | null;
  locale?: string | null;
}): { html: string; text: string; subject: string } {
  const copy = pickCopy(COPIES, args.locale);
  const sujet = (args.sujet ?? "").trim() || pickCopy(SANS_SUJET, args.locale);

  const { html, text } = renderTiquizMessage({
    subject: copy.subject(sujet),
    heading: copy.heading,
    paragraphes: [args.reponse.trim(), `${copy.rappel}\n${args.question.trim()}`],
    footer: copy.footer,
  });

  return { html, text, subject: copy.subject(sujet) };
}
