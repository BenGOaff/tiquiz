// lib/rateLimit/parIp.ts
//
// LA LIMITE PAR ADRESSE IP D'UNE ROUTE PUBLIQUE.
//
// -- LE DÉFAUT QU'ON FERME, ET IL A DÉJÀ ÉTÉ PAYÉ ----------------------
//
// L'audit du 24 août l'avait trouvé côté Tipote : le compteur faisait
// `compteur.clear()` dès que la table dépassait sa taille, donc il
// remettait à zéro le compteur de TOUT LE MONDE. Un garde-fou qu'on
// peut désarmer en le remplissant n'en est pas un, et celui-ci se
// désarmait aussi un jour de trafic normal.
//
// Il a été corrigé là-bas et PAS ici : le 30 août 2026,
// `app/api/support/ticket/route.ts` de ce dépôt portait encore le
// `clear()`. Un garde-fou qui ne protège qu'un des deux jumeaux ne
// protège personne (leçon des deux versions divergentes de `pdf-parse`,
// 7 août). Il vit maintenant dans un module PUR, partagé par toutes les
// routes publiques qui écrivent.
//
// -- CE QU'ON PURGE, ET DANS QUEL ORDRE --------------------------------
//
// D'abord ce qui a EXPIRÉ : ces entrées ne protègent plus personne, et
// c'est presque toujours suffisant. S'il reste trop de monde après ça,
// on retire les PLUS ANCIENNES, pas toutes : quelqu'un qui martèle la
// route à l'instant est justement celui dont il faut garder le compte.
//
// `maintenant` est un PARAMÈTRE : un test qui dépend de l'horloge
// clignote, et un test qui clignote est pire que pas de test.

/** Une fenêtre de comptage pour une adresse. */
interface Fenetre {
  n: number;
  jusqu: number;
}

export interface OptionsLimite {
  /** Combien d'appels sont tolérés dans la fenêtre. */
  max: number;
  /** La durée de la fenêtre, en millisecondes. */
  fenetreMs: number;
  /** Au delà de combien d'adresses suivies on fait le ménage. */
  tailleMax?: number;
}

export interface Limiteur {
  /** `true` quand cet appel dépasse la limite. */
  trop(ip: string, maintenant?: number): boolean;
  /** Le nombre d'adresses suivies. Sert aux tests et au diagnostic. */
  taille(): number;
}

const TAILLE_MAX_DEFAUT = 5000;

export function creerLimiteur(options: OptionsLimite): Limiteur {
  const table = new Map<string, Fenetre>();
  const tailleMax = options.tailleMax ?? TAILLE_MAX_DEFAUT;

  function menage(maintenant: number): void {
    if (table.size <= tailleMax) return;
    // 1. ce qui a expiré ne protège plus personne.
    for (const [ip, f] of table) {
      if (maintenant > f.jusqu) table.delete(ip);
    }
    if (table.size <= tailleMax) return;
    // 2. SINON ON RETIRE, MAIS JAMAIS CEUX QUI SONT DÉJÀ BLOQUÉS.
    //
    // Premier jet : on retirait "les plus anciennes". Mon propre test
    // l'a attrapé, et c'était le bug d'origine sous une autre forme.
    // Toutes les entrées d'une même seconde partagent la même échéance,
    // donc le tri les laissait dans l'ordre d'insertion, donc la
    // première retirée était celle qui martelait la route DEPUIS LE
    // DÉBUT. Il suffisait d'inonder depuis des adresses jetables pour
    // se faire débloquer.
    //
    // Une entrée au dessus de la limite est exactement ce que ce
    // compteur existe pour retenir : elle sort en DERNIER, et seulement
    // s'il ne reste rien d'autre à retirer.
    const candidats = [...table.entries()].sort((a, b) => {
      const bloqueA = a[1].n > options.max ? 1 : 0;
      const bloqueB = b[1].n > options.max ? 1 : 0;
      if (bloqueA !== bloqueB) return bloqueA - bloqueB;
      return a[1].jusqu - b[1].jusqu;
    });
    for (const [ip] of candidats.slice(0, table.size - tailleMax)) {
      table.delete(ip);
    }
  }

  return {
    trop(ip: string, maintenant: number = Date.now()): boolean {
      const cle = String(ip ?? "").trim() || "inconnue";
      const vu = table.get(cle);
      if (!vu || maintenant > vu.jusqu) {
        table.set(cle, { n: 1, jusqu: maintenant + options.fenetreMs });
        menage(maintenant);
        return 1 > options.max;
      }
      vu.n += 1;
      menage(maintenant);
      return vu.n > options.max;
    },
    taille() {
      return table.size;
    },
  };
}

/**
 * L'adresse réelle du visiteur, derrière Caddy puis Cloudflare.
 *
 * On lit la PREMIÈRE valeur de `x-forwarded-for` : c'est le client, les
 * suivantes sont les relais. Sans adresse lisible on rend "inconnue",
 * ce qui met tous ces appels dans le même seau : c'est le comportement
 * prudent, et il ne peut pas ouvrir la porte.
 */
export function ipDeLaRequete(entetes: Headers): string {
  const cf = entetes.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  const xff = entetes.get("x-forwarded-for")?.split(",")[0]?.trim();
  return xff || "inconnue";
}
