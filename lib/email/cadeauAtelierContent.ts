// lib/email/cadeauAtelierContent.ts
//
// « ON TE REPROPOSE L'ATELIER, TU AS DEUX JOURS » (Béné, 18 septembre 2026).
//
// "6 mois après son inscription gratos, on lui repropose ce cadeau pour
// le réactiver : on lui donne 2 jours pour upgrader et recevoir
// l'atelier gratos. Idem 1 an après sa première inscription."
//
// PAS de `server-only`, aucun appel réseau : un test doit pouvoir lire
// ce texte. L'envoi vit dans `cadeauAtelierEmail.ts`, à côté.
//
// -- LA DATE LIMITE VIENT DU SERVEUR, ELLE NE SE RECALCULE PAS ICI -----
//
// La fenêtre part de la date d'ENVOI (voir `atelierOffert.ts`), pas
// d'une date calculée depuis l'inscription. Recalculer "dans 2 jours"
// dans l'email donnerait une deuxième date, et le jour où le cron prend
// du retard, ce sont deux promesses différentes dans la même boîte.
//
// -- ON NE GENRE PAS LE LECTEUR ----------------------------------------
//
// Les prénoms de ce dépôt le disent : François Xavier, Éric, Maurice,
// Ivan. On tourne la phrase, on ne met ni accord au féminin ni point
// médian (règle du 23 août).

import { renderTiquizEmail } from "./tiquizShell";

export interface ContenuCadeauAtelier {
  subject: string;
  html: string;
  text: string;
}

/** La date limite, écrite comme on la lit. */
export function jusquAu(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "dans deux jours";
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(t));
}

export function buildCadeauAtelierContent(args: {
  prenom?: string | null;
  /** `relance_6_mois` ou `relance_1_an` : le texte n'est pas le même. */
  fenetre: "relance_6_mois" | "relance_1_an";
  /** La fin de la fenêtre, telle que le serveur l'a fixée. */
  finLe: string;
  /** Vers le bon de commande. */
  lien: string;
}): ContenuCadeauAtelier {
  const bonjour = args.prenom?.trim() ? `Bonjour ${args.prenom.trim()},` : "Bonjour,";
  const limite = jusquAu(args.finLe);

  // SIX MOIS ET UN AN NE SE DISENT PAS PAREIL. Le second s'adresse à
  // quelqu'un qui a son compte depuis un an sans jamais avoir payé :
  // lui écrire "tu viens de t'inscrire" serait ridicule.
  const depuis =
    args.fenetre === "relance_6_mois"
      ? "Ça fait six mois que ton compte Tiquiz est ouvert."
      : "Ça fait un an que ton compte Tiquiz est ouvert.";

  const subject =
    args.fenetre === "relance_6_mois"
      ? "L'Atelier du Quiz offert, si tu passes au payant avant " + limite
      : "Dernière fois : l'Atelier du Quiz offert jusqu'à " + limite;

  const { html, text } = renderTiquizEmail(args.lien, {
    subject,
    heading: "L'Atelier du Quiz, offert avec ton abonnement",
    intro:
      `${bonjour}\n\n${depuis}\n\n` +
      "Je te repropose ce que je réserve d'habitude aux nouveaux comptes : " +
      "si tu prends un abonnement payant, n'importe lequel, je t'ouvre " +
      "l'Atelier du Quiz en entier, gratuitement et à vie.",
    points: [
      "L'Atelier, c'est la formation où j'explique comment construire un quiz qui fait vraiment entrer des gens dans ta liste.",
      "Elle se vend à part. Là, elle est comprise.",
      `<strong>Jusqu'à ${limite}.</strong> Après, ton abonnement restera possible, mais l'Atelier ne sera plus dedans.`,
    ],
    cta: "Choisir mon abonnement",
    // ON NE GENRE PAS, et on ne fait pas peur : cette personne n'a rien
    // demandé, elle a juste un compte gratuit ouvert depuis longtemps.
    ignore: "Si tu préfères rester sur le gratuit, tu n'as rien à faire.",
    linkFallback: "Si le bouton ne marche pas, copie ce lien :",
    footer: "Tiquiz, le logiciel de quiz connecté à ton outil d'emailing.",
  });

  return { subject, html, text };
}
