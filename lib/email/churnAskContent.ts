// lib/email/churnAskContent.ts
//
// LE TEXTE DE L'EMAIL "POURQUOI TU PARS ?", ET RIEN D'AUTRE.
//
// Séparé de l'envoi (`churnAskEmail.ts`) pour UNE raison : l'envoi est
// marqué `server-only`, donc le runner de tests natif ne peut pas le
// charger. Un texte qui part sous la signature de Béné et qu'aucun test
// ne peut lire est exactement le genre de chose qui dérive : un tiret
// cadratin qui revient, un lien qui disparaît, une formule d'assistant
// qui se glisse. Le contenu vit donc ici, en fonction pure.
//
// -- CE QUE CET EMAIL N'EST PAS ----------------------------------------
//
// Ce n'est PAS une tentative de la faire revenir. Pas de remise, pas de
// "es-tu sûre ?", pas de deuxième relance. Quelqu'un qui vient de partir
// et qui reçoit une offre comprend qu'on ne l'écoutait pas, on l'écoutait
// payer. Une seule question, une seule fois, et on la laisse tranquille.
//
// -- LA VOIX ------------------------------------------------------------
//
// C'est Béné qui signe. Tutoiement, aucun tiret cadratin, aucun
// anglicisme, aucune formule d'assistant. Elle valide avant de
// questionner ("aucun souci"), elle glisse une parenthèse en aparté, et
// elle ne promet rien qu'elle ne tiendra pas. Le bouton est posé au
// MILIEU du corps, puis le texte reprend, puis la signature, puis un PS :
// un bouton collé à une signature, elle trouve ça moche.

function echappe(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildChurnAskContent(args: {
  prenom: string | null;
  lien: string;
}): { subject: string; html: string; text: string } {
  const bonjour = args.prenom && args.prenom.trim() ? `Hey ${args.prenom.trim()} 👋` : "Hey 👋";

  const lignes = [
    bonjour,
    "Tu as arrêté ton abonnement Tiquiz. Aucun souci, vraiment, et je ne vais pas essayer de te faire changer d'avis (ni te relancer trois fois, promis).",
    "J'ai juste une question, une seule : qu'est-ce qui n'allait pas ?",
    "Ce qui manquait, ce qui coinçait, ce que tu cherchais et que tu n'as pas trouvé. Même si c'est sec, même si c'est un détail. C'est avec ça que je corrige Tiquiz pour celles qui arrivent après toi, et je lis tout moi-même.",
    "Ton compte reste ouvert et tes quiz restent à toi. Tu repasses simplement en gratuit, tu ne perds rien.",
    "Béné",
    "PS : si c'est un bug qui t'a fait partir, dis le moi vraiment. C'est le genre de chose que je veux savoir tout de suite, pas dans six mois.",
  ];

  const bouton =
    `<p style="margin:24px 0"><a href="${echappe(args.lien)}" ` +
    `style="background:#5D6CDB;color:#fff;padding:12px 22px;border-radius:10px;` +
    `text-decoration:none;font-weight:700;display:inline-block">Je te dis en deux lignes →</a></p>`;

  const paragraphe = (l: string) =>
    `<p style="margin:0 0 14px;line-height:1.6">${echappe(l)}</p>`;

  const html =
    lignes.slice(0, 3).map(paragraphe).join("") +
    bouton +
    lignes.slice(3).map(paragraphe).join("");

  // En texte brut, le lien remplace le bouton, a la meme place.
  const text = [...lignes.slice(0, 3), args.lien, ...lignes.slice(3)].join("\n\n");

  return {
    subject: "Une question, et je te laisse tranquille",
    html: `<div style="font-family:system-ui,sans-serif;font-size:16px;color:#16182e">${html}</div>`,
    text,
  };
}
