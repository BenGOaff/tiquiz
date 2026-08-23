// lib/checkout/brand.ts
//
// LES COULEURS DU TUNNEL DE VENTE, ÉCRITES UNE SEULE FOIS.
//
// Jumeau du fichier de l'Atelier, avec la palette de la page de vente de
// Tiquiz. Les valeurs sont RELEVÉES dans `content/sales/tiquiz.html`,
// pas inventées, et pas reprises des jetons de l'app : le bon de commande
// est vu par quelqu'un qui n'a pas de compte et qui vient de lire la page
// de vente, pas par une créatrice dans son tableau de bord.
//
// -- POURQUOI UN FICHIER POUR SIX COULEURS -----------------------------
//
// Parce qu'elles sont lues des DEUX côtés de la frontière : par notre
// page (en classes Tailwind) et par Stripe (en paramètres d'API). Le
// formulaire de paiement s'affiche dans une iframe hébergée par
// `js.stripe.com`, et la politique de même origine du navigateur fait que
// NOTRE CSS ne le traverse pas : aucune classe, aucune variable, aucun
// réglage Tailwind n'a d'effet à l'intérieur. Le seul moyen de lui
// donner le fond clair de la page est `branding_settings` sur la session.
//
// Deux endroits qui décident de la même couleur finissent toujours par se
// contredire, et cette fois la contradiction se verrait au pire moment,
// au milieu d'un paiement.

/** Le bleu nuit du texte et des titres. */
export const NUIT = "#2b3264";
/** L'indigo des boutons et des liens. La couleur d'action. */
export const INDIGO = "#5e6dde";
/** Le cyan des accents. */
export const CYAN = "#20bbe6";
/** Le gris bleuté du texte secondaire. */
export const GRIS = "#8890b5";
/** Le bleu très clair des cartes. */
export const CLAIR = "#f3f6fc";
/** Le bleu clair des bordures. */
export const BORDURE = "#e4e7f5";

/**
 * Le pied de page légal, celui de ses pages Systeme.io.
 *
 * Il vit ici parce que le bon de commande et la page de remerciement en
 * ont besoin tous les deux, et qu'une liste de liens recopiée à deux
 * endroits finit avec un lien mort d'un côté et pas de l'autre.
 */
export const LIENS_LEGAUX: readonly { texte: string; href: string }[] = [
  { texte: "Politique de confidentialité", href: "https://www.tipote.fr/politique-de-confidentialite" },
  { texte: "Mentions légales", href: "https://www.tipote.fr/mentions-legales" },
  { texte: "Conditions générales de vente", href: "https://www.tipote.fr/cgv" },
  { texte: "Conditions générales d'utilisation", href: "https://www.tipote.fr/cgu" },
  { texte: "Politique de cookies", href: "https://www.tipote.fr/politique-de-cookies" },
  { texte: "Affiliation", href: "https://www.tipote.fr/affiliation" },
];

/**
 * Là où on répond quand quelque chose cloche.
 *
 * C'était `https://www.tipote.com/contact`, qui n'est ni un domaine à
 * nous (le nôtre est `tipote.fr`) ni une page de support. Béné, 23 août :
 * "le support me donne cette url alors que le support n'est pas là du
 * tout."
 *
 * La bonne adresse est NOTRE formulaire, celui du 22 août : il est
 * public (elle n'a pas besoin d'être connectée pour écrire, et c'est
 * justement celle qui n'arrive pas à se connecter qui en a le plus
 * besoin) et il alimente la file de tickets de l'admin. Le centre
 * d'aide de Tipote (`app.tipote.com/support`) sert les ARTICLES, il n'a
 * pas de formulaire : y envoyer quelqu'un qui a un problème de paiement
 * le laisse sans interlocuteur.
 *
 * En absolu et pas en relatif : cette page est aussi servie sur
 * `tiquiz.fr`, où tout chemin non autorisé répond 404.
 */
export const LIEN_SUPPORT = "https://quiz.tipote.com/support";

/**
 * Ce qu'on envoie à Stripe pour que son formulaire ressemble à la page
 * qui l'entoure.
 *
 * `font_family` prend un identifiant de la liste de Stripe : Inter y est,
 * et c'est déjà la police de l'app comme de la page de vente.
 *
 * On ne touche PAS au nom affiché (`display_name`). Il vient du compte
 * Stripe, il doit rester celui qui apparaît sur le relevé bancaire, et
 * un écart entre les deux est une cause classique de contestation.
 */
export const STRIPE_BRANDING: Readonly<Record<string, string>> = {
  "branding_settings[background_color]": "#ffffff",
  "branding_settings[button_color]": INDIGO,
  "branding_settings[font_family]": "inter",
  "branding_settings[border_style]": "rounded",
};
