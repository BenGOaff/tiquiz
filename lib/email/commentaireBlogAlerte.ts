// lib/email/commentaireBlogAlerte.ts
//
// UN COMMENTAIRE ARRIVE : BÉNÉ EST PRÉVENUE, DANS LES DEUX CAS.
//
// Béné, 31 août 2026 : "l'idée c'est de permettre aux gens de laisser
// des commentaires (MAIS JE DOIS ÊTRE ALERTÉE POUR SAVOIR QU'IL Y EN
// A) et de montrer aux moteurs de recherche et à l'IA que mon blog
// intéresse le public."
//
// C'était le vrai trou. La file de modération existait, l'écran
// d'admin existait, et rien ne lui disait qu'il y avait quelque chose
// dedans : un écran qu'on n'ouvre pas ne prévient personne (même
// constat que l'alerte de vente refusée du 7 août et que l'alerte de
// support du 22).
//
// -- ON PRÉVIENT AUSSI POUR CE QUI EST DÉJÀ EN LIGNE ------------------
//
// Un commentaire auto-publié n'appelle aucune action, mais il apparaît
// sur SON site sous SON nom. Elle doit pouvoir le lire, y répondre, ou
// le retirer. Ne l'alerter que sur les cas douteux lui ferait découvrir
// les autres par hasard, des semaines plus tard.
//
// L'email dit donc lequel des deux c'est, dès l'objet : elle trie sa
// boîte sans ouvrir.
//
// -- BEST-EFFORT DE BOUT EN BOUT --------------------------------------
//
// Un échec d'envoi ne change RIEN à la réponse faite à la lectrice :
// son commentaire est déjà enregistré. Lui répondre "erreur" parce que
// NOTRE alerte n'est pas partie lui ferait renvoyer son message cinq
// fois, et c'est le genre de boucle qui remplit une table.

import "server-only";

import { ADMIN_EMAILS } from "@/lib/adminEmails";
import { resolveAppUrl } from "@/lib/authLinks";
import {
  PHRASE_MOTIF,
  objetAlerte,
  type MotifRetenue,
  type StatutCommentaire,
} from "@/lib/blog/commentaires";
import { HOTE_VENTE } from "@/lib/publicHost";
import { renderTiquizMessage, tiquizFrom } from "./tiquizShell";

const RESEND_URL = "https://api.resend.com/emails";

export interface AlerteCommentaireArgs {
  slug: string;
  auteur: string;
  message: string;
  email: string | null;
  statut: StatutCommentaire;
  motifs: readonly MotifRetenue[];
}

export async function envoyerAlerteCommentaire(a: AlerteCommentaireArgs): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn("[commentaireBlog] RESEND_API_KEY manquante : Béné n'est pas prévenue.");
    return false;
  }
  if (ADMIN_EMAILS.length === 0) return false;

  const appUrl = resolveAppUrl(process.env.NEXT_PUBLIC_APP_URL);
  const objet = objetAlerte(a);
  const enLigne = a.statut === "publie";

  const { html, text } = renderTiquizMessage({
    subject: objet,
    heading: enLigne ? "Nouveau commentaire, déjà en ligne" : "Un commentaire attend ton feu vert",
    paragraphes: [
      `${a.auteur} sur l'article "${a.slug}"`,
      a.message,
      a.motifs.length > 0 ? `Retenu parce qu'il ${a.motifs.map((m) => PHRASE_MOTIF[m]).join(", ")}.` : "",
      // Le blog vit sur le domaine PUBLIC, l'admin sur celui de l'app :
      // deux hôtes différents, et recopier l'un pour l'autre donnerait
      // un lien mort (drame des URLs canoniques, 3 juin).
      enLigne
        ? `Le voir : ${HOTE_VENTE}/blog/${a.slug}#commentaires`
        : `Le relire : ${appUrl}/admin (onglet Support)`,
      a.email ? `Pour lui répondre : ${a.email}` : "",
    ].filter(Boolean),
    footer: enLigne
      ? "Rien à faire. Tu peux le retirer depuis l'admin si besoin."
      : "Publier ou refuser depuis l'onglet Support de l'admin Tiquiz.",
  });

  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: tiquizFrom(),
        to: [...ADMIN_EMAILS],
        // La lectrice en `reply_to` quand elle a laissé son adresse :
        // répondre à un commentaire est la meilleure façon de faire
        // revenir quelqu'un, et chercher son adresse dans l'admin est
        // exactement ce qui fait qu'on ne le fait jamais.
        ...(a.email ? { reply_to: a.email } : {}),
        subject: objet,
        html,
        text,
      }),
    });
    if (!res.ok) {
      console.error(`[commentaireBlog] Resend a refusé (${res.status}).`);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`[commentaireBlog] ${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
}
