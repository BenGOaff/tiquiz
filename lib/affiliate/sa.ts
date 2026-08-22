// lib/affiliate/sa.ts
//
// L'IDENTIFIANT DE L'AFFILIÉE, DEPUIS SON LIEN JUSQU'À SA COMMISSION.
//
// Jumeau de `lib/affiliate/sa.ts` côté Atelier : toute correction ici se
// porte là-bas, et réciproquement.
//
// -- LE TROU QUE CE FICHIER BOUCHE -------------------------------------
//
// Jusqu'ici, une affiliée envoyait vers `tipote.fr/part-tiquiz`, un
// tunnel Systeme.io. Le `?sa=` y était capté par leur page, l'optin
// créait une conversion, et la vente Systeme.io retombait sur l'affiliée
// par l'adresse email.
//
// Depuis qu'on vend sur NOTRE domaine avec NOTRE bon de commande, plus
// rien de tout ça n'existe : pas de page Systeme.io, donc pas de captage
// du `sa`, pas d'optin, donc pas de conversion, et la vente n'arrive
// jamais chez Systeme.io. **Une affiliée qui envoie du monde sur
// tiquiz.fr n'est payée sur rien.** Elle n'a aucun moyen de le
// voir, et nous non plus.
//
// -- LA CHAÎNE, EN TROIS PIÈCES ----------------------------------------
//
// 1. le `?sa=` arrive sur une de nos pages -> le middleware le range dans
//    un cookie de PREMIÈRE PARTIE (le nôtre, sur notre domaine) ;
// 2. le bon de commande le relit et le passe à Stripe en `metadata` ;
// 3. le webhook de paiement le retrouve dans la vente et crée la
//    commission.
//
// Les trois sont obligatoires. En zapper une remet le bug, et le bug est
// silencieux : tout marche, l'argent rentre, et personne n'est payé.
//
// -- POURQUOI 90 JOURS -------------------------------------------------
//
// C'est la fenêtre d'attribution déjà appliquée par
// le module d'attribution de Tipote sur les conversions par email
// (`ATTRIBUTION_WINDOW_DAYS`). Deux durées différentes pour la même
// promesse donneraient deux réponses différentes selon le chemin
// emprunté par l'acheteuse, ce qui est indéfendable devant une affiliée.
//
// -- ET LA RÈGLE HABITUELLE : ON NE FAIT JAMAIS CONFIANCE À L'URL ------
//
// `sa` finit dans une requête SQL et dans un versement. On ne garde donc
// que ce qui a EXACTEMENT la forme d'un identifiant Systeme.io. Tout le
// reste est jeté sans bruit : une valeur inventée ne doit pas pouvoir
// créer une ligne de commission au nom de personne.

/** Format Systeme.io : "sa" + 20 à 80 caractères hexadécimaux. */
export const SA_RE = /^sa[a-f0-9]{20,80}$/i;

/** Le nom du paramètre dans les liens d'affiliation. */
export const SA_PARAM = "sa";

/**
 * Le cookie de première partie qui porte l'identifiant entre la page de
 * vente et le paiement.
 *
 * Nom court et neutre : il est visible par l'acheteuse dans son
 * navigateur, il n'a pas à raconter notre plomberie.
 */
export const SA_COOKIE = "tq_sa";

/** 90 jours, en secondes. Même fenêtre que l'attribution par email. */
export const SA_MAX_AGE_SECONDS = 90 * 24 * 60 * 60;

/**
 * L'identifiant s'il est valide, `null` sinon.
 *
 * Ne jette jamais : cette fonction est appelée sur des valeurs qui
 * viennent d'une URL publique et d'un cookie, donc de n'importe où.
 */
export function readSa(value: unknown): string | null {
  const propre = String(value ?? "").trim();
  if (!propre) return null;
  return SA_RE.test(propre) ? propre : null;
}

/**
 * Qui gagne entre l'URL et le cookie : **l'URL, toujours.**
 *
 * Le cas concret : quelqu'un arrive par le lien de Martine, ne paie pas,
 * revient trois jours plus tard par le lien de Christian et achète.
 * C'est Christian qui a fermé la vente. C'est aussi la règle déjà
 * appliquée aux conversions par email ("last touch", la plus récente
 * l'emporte) : deux règles opposées selon le chemin donneraient deux
 * réponses différentes pour la même vente.
 */
export function pickSa(depuisUrl: unknown, depuisCookie: unknown): string | null {
  return readSa(depuisUrl) ?? readSa(depuisCookie);
}

/**
 * L'identifiant tel que le bon de commande le voit depuis le navigateur.
 *
 * `recherche` = la query de la page (`window.location.search`),
 * `cookies` = `document.cookie`, brut. Les deux peuvent être vides, et
 * ce n'est pas une anomalie : la plupart des acheteuses n'arrivent par
 * aucun lien d'affiliation.
 *
 * Cette fonction vit ici, et pas dans le composant, pour la raison
 * habituelle : une logique enfermée dans un composant React n'est pas
 * testable, donc elle n'est pas testée, donc c'est là que les bugs
 * s'installent. Et celui là ne se verrait pas à l'écran.
 */
export function readSaFromBrowser(recherche: string, cookies: string): string | null {
  let depuisUrl: string | null = null;
  try {
    depuisUrl = new URLSearchParams(recherche || "").get(SA_PARAM);
  } catch {
    depuisUrl = null;
  }

  let depuisCookie: string | null = null;
  for (const morceau of String(cookies ?? "").split(";")) {
    const i = morceau.indexOf("=");
    if (i < 0) continue;
    if (morceau.slice(0, i).trim() !== SA_COOKIE) continue;
    try {
      depuisCookie = decodeURIComponent(morceau.slice(i + 1).trim());
    } catch {
      depuisCookie = morceau.slice(i + 1).trim();
    }
    break;
  }

  return pickSa(depuisUrl, depuisCookie);
}
