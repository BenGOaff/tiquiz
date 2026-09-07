// lib/trafic/signalerVue.ts
//
// L'ENVOI DE LA VUE, DEPUIS LE MIDDLEWARE.
//
// Ce module est importe par le middleware, qui tourne sur EDGE (verifie
// le 7 septembre dans `.next/server/middleware-manifest.json` : ses
// morceaux sont dans `server/edge/chunks`, pas suppose). Il ne peut donc
// ni importer `supabaseAdmin`, ni toucher la base : il POSTe sur une
// route de la meme app, qui elle tourne sur Node.
//
// C'est exactement le patron de `signalerClic` (27 aout), qui poste chez
// Tipote depuis ce meme middleware et qui tourne en production depuis.
// On ne reinvente pas une mecanique quand une equivalente marche deja.
//
// -- LES TROIS REGLES, ET CE SONT TOUTES DES REFUS ---------------------
//
// 1. CA NE FAIT JAMAIS ATTENDRE LE VISITEUR. Appel dans le `waitUntil`
//    du middleware, donc hors du chemin de la reponse, avec un delai
//    maximum court. Une page de vente ralentie coute une vente ; une vue
//    non comptee coute une ligne dans un tableau.
// 2. CA NE LEVE JAMAIS. Une base indisponible ne doit pas faire
//    disparaitre une page publique.
// 3. CA NE DECIDE RIEN. Ce qui compte comme vue, le chemin retenu et la
//    source vivent dans `vueASignaler.ts`, en fonctions pures et
//    testees. Deux endroits qui decideraient chacun de leur cote
//    finiraient par ne pas dire la meme chose, et c'est le tableau de
//    bord qui mentirait.
//
// -- POURQUOI `CRON_SECRET` ET PAS UNE VARIABLE DE PLUS ----------------
//
// Cette route ecrit dans un compteur : sans secret, n'importe qui
// pourrait gonfler les chiffres de son tableau de bord depuis un
// navigateur, et un tableau qu'on peut remplir de l'exterieur ne vaut
// rien.
//
// Mais une variable d'environnement NEUVE est une variable qui peut
// n'etre jamais posee, et la fonctionnalite ne dirait rien : c'est
// exactement ce qui est arrive a `PARTNER_SHARED_SECRET` (23 aout).
// `CRON_SECRET` est deja pose sur ce serveur, il sert deja a authentifier
// des appels internes, et il ne quitte jamais la machine. On le reutilise
// donc, et on l'ECRIT ici pour que ce ne soit pas une surprise.
//
// Absent -> on ne compte pas, et l'ecran DIT que le comptage n'est pas
// branche. Il n'affiche jamais "0 vue", qui serait un mensonge.

export interface VueASignaler {
  hote: string;
  chemin: string;
  source: string;
}

/**
 * Signale la vue a notre propre route. Ne leve jamais, n'attend presque
 * pas.
 *
 * A appeler dans un `waitUntil` : la valeur de retour n'interesse
 * personne, seul l'effet compte.
 */
export async function signalerVue(origine: string, vue: VueASignaler): Promise<void> {
  const secret = (process.env.CRON_SECRET ?? "").trim();
  if (!secret) return;
  try {
    await fetch(`${origine}/api/interne/trafic`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Cron-Secret": secret },
      body: JSON.stringify(vue),
      signal: AbortSignal.timeout(2000),
    });
  } catch {
    // Volontairement muet : c'est une statistique, et elle passe APRES
    // la page.
  }
}
