// lib/embed/limites.ts
// Les bornes du générateur PUBLIC (aucun compte demandé), dans un module
// PUR : aucune base, aucune variable d'environnement, aucun disque.
//
// ── POURQUOI CE MODULE EXISTE, ET C'EST LA VRAIE RAISON ──────────────
//
// Ces trois nombres sont ANNONCÉS à la visiteuse sur
// `/generateur-de-quiz` (la FAQ dit combien de quiz elle peut écrire).
// Ils sont donc lus par une page publique ET par le code qui compte.
//
// `lib/embed/rateLimit.ts` importe `supabaseAdmin`, qui LÈVE au
// chargement quand une variable manque : une page publique qui
// l'importerait répondrait 500 sans base, et aucun test logique ne
// pourrait le charger. C'est exactement le piège du 30 août
// (`commentairesStore.ts` importé en tête d'un article de blog).
//
// Le chiffre vit donc ICI, et les deux côtés le LISENT. Un nombre
// recopié à la main dans la page serait faux au premier réglage, à
// l'endroit précis où une lectrice le vérifie.

/** Par adresse email, sur la même fenêtre. Elle n'est connue qu'à la publication. */
export const LIMITE_PAR_EMAIL = 2;

/** Par réseau. C'est la seule qui morde à la génération : on n'a pas d'email avant. */
export const LIMITE_PAR_IP = 2;

/** La fenêtre, en heures. Voir `rateLimit.ts` : 24 h et pas "à vie", exprès. */
export const FENETRE_HEURES = 24;
