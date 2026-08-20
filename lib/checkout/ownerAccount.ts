// lib/checkout/ownerAccount.ts
//
// LES COMPTES DE PAIEMENT DE BÉNÉ, LUS À UN SEUL ENDROIT.
//
// Le dépôt sait déjà encaisser : `lib/resellerPayments.ts` charge les
// identifiants d'un REVENDEUR depuis la base, chiffrés, parce que ce sont
// les secrets de quelqu'un d'autre. Ici c'est l'inverse : ce sont NOS
// secrets, donc ils vivent là où vivent tous les autres, dans le `.env`
// du serveur.
//
// -- L'ABSENCE FERME, ET LA VALEUR FAUSSE AUSSI ------------------------
//
// C'est la leçon du 2 août (drame Véronique) : `process.env.X ?? defaut`
// ne protège que de la variable ABSENTE, jamais de la variable FAUSSE.
// Une clé mal collée, tronquée par un retour à la ligne, ou copiée depuis
// le mauvais onglet, traverserait tout et n'échouerait qu'au moment du
// paiement, devant un client. On valide donc la FORME, et tout ce qui ne
// ressemble pas à une clé n'existe pas.
//
// -- LE MODE N'EST JAMAIS DEVINÉ, IL EST LU DANS LA CLÉ ----------------
//
// Une clé Stripe porte son environnement dans son nom (`sk_test_`,
// `sk_live_`). C'est la seule source honnête : une variable
// `STRIPE_MODE=live` posée à côté d'une clé de test mentirait, et on
// s'en apercevrait en cherchant un virement qui n'arrivera jamais.

/**
 * D'où on lit les variables.
 *
 * Volontairement plus simple que `NodeJS.ProcessEnv` : ces fonctions n'ont
 * besoin que de quelques clés, et exiger le type complet de l'environnement
 * obligerait chaque test à fabriquer un `process.env` entier, ou à forcer le
 * silence avec une assertion. C'est la leçon du 7 août : une assertion ne
 * convertit rien, elle interdit la vérification.
 */
export type EnvSource = Readonly<Record<string, string | null | undefined>>;

/** Le mode d'un compte de paiement, tel que la clé le déclare elle-même. */
export type PaymentMode = "live" | "test";

export interface OwnerStripeAccount {
  key: string;
  mode: PaymentMode;
}

export interface OwnerPaypalAccount {
  clientId: string;
  secret: string;
  mode: PaymentMode;
}

/**
 * Le mode déclaré par une clé Stripe, ou `null` si ça n'est pas une clé.
 *
 * `sk_` = clé secrète, `rk_` = clé restreinte (une clé restreinte suffit
 * et expose moins : c'est celle à préférer). Tout le reste est refusé,
 * y compris une clé PUBLIABLE (`pk_`) collée par erreur, qui ressemble
 * beaucoup à une clé secrète quand on va vite.
 */
export function stripeKeyMode(raw: string | null | undefined): PaymentMode | null {
  const key = String(raw ?? "").trim();
  if (!/^(sk|rk)_(live|test)_[A-Za-z0-9]{8,}$/.test(key)) return null;
  return key.includes("_live_") ? "live" : "test";
}

/**
 * Le compte Stripe de Béné, ou `null` si rien d'utilisable n'est posé.
 *
 * Exportée avec l'environnement en PARAMÈTRE pour être testable sans
 * toucher au `process.env` du runner : la mécanique est un paramètre,
 * jamais une variable devinée à l'intérieur.
 */
export function readOwnerStripe(env: EnvSource): OwnerStripeAccount | null {
  const key = String(env.STRIPE_SECRET_KEY_OWNER ?? "").trim();
  const mode = stripeKeyMode(key);
  if (!mode) return null;
  return { key, mode };
}

/**
 * Le secret de signature du webhook Stripe.
 *
 * Séparé de la clé parce qu'il ne sert pas à la même chose et qu'il peut
 * manquer alors que la clé est là : dans ce cas on peut encaisser mais
 * pas ouvrir l'accès de façon fiable. Le savoir vaut mieux que de le
 * découvrir sur une vente.
 */
export function readOwnerStripeWebhookSecret(env: EnvSource): string | null {
  const secret = String(env.STRIPE_WEBHOOK_SECRET_OWNER ?? "").trim();
  return /^whsec_[A-Za-z0-9]{8,}$/.test(secret) ? secret : null;
}

/**
 * Le compte PayPal de Béné.
 *
 * Décision du 20 août : l'argent PayPal arrive sur SON compte PayPal, pas
 * dans Stripe. Les deux identifiants vont donc ensemble, et l'un sans
 * l'autre ne vaut rien : on renvoie `null` plutôt qu'un objet à moitié
 * rempli qui échouerait plus tard, plus loin, avec un message moins clair.
 *
 * Le mode vient de `PAYPAL_ENV_OWNER` parce que, contrairement à Stripe,
 * un identifiant PayPal ne dit pas d'où il vient. Valeur absente ou
 * illisible : on retient `sandbox`. C'est le seul défaut acceptable, il
 * ne peut coûter que des paiements qui n'aboutissent pas, jamais de
 * l'argent perdu.
 */
export function readOwnerPaypal(env: EnvSource): OwnerPaypalAccount | null {
  const clientId = String(env.PAYPAL_CLIENT_ID_OWNER ?? "").trim();
  const secret = String(env.PAYPAL_SECRET_OWNER ?? "").trim();
  if (clientId.length < 20 || secret.length < 20) return null;
  const declared = String(env.PAYPAL_ENV_OWNER ?? "").trim().toLowerCase();
  return { clientId, secret, mode: declared === "live" ? "live" : "test" };
}

export interface OwnerProviders {
  stripe: boolean;
  paypal: boolean;
  /** Le mode commun, ou `null` si rien n'est branché. */
  mode: PaymentMode | null;
  /**
   * Vrai quand les deux comptes sont branchés dans des modes DIFFÉRENTS.
   *
   * Ça n'est pas théorique : on teste Stripe en test pendant que PayPal
   * est déjà en production, et l'écran affiche alors "mode test" pour un
   * bouton qui prélève vraiment. L'appelant doit le montrer, pas le taire.
   */
  mixedModes: boolean;
}

/**
 * Ce qu'on peut proposer au client, MAINTENANT.
 *
 * Aucun bouton n'est affiché pour un moyen de paiement qui n'est pas
 * branché : un bouton qui échoue est pire que pas de bouton, parce qu'il
 * fait croire à l'acheteur que le problème vient de lui.
 */
export function readOwnerProviders(env: EnvSource): OwnerProviders {
  const stripe = readOwnerStripe(env);
  const paypal = readOwnerPaypal(env);
  const modes = [stripe?.mode, paypal?.mode].filter(Boolean) as PaymentMode[];
  return {
    stripe: Boolean(stripe),
    paypal: Boolean(paypal),
    // En cas de désaccord, on annonce le mode le plus dangereux : "live".
    // Annoncer "test" devant un bouton qui prélève serait le mensonge le
    // plus coûteux des deux.
    mode: modes.includes("live") ? "live" : (modes[0] ?? null),
    mixedModes: modes.length === 2 && modes[0] !== modes[1],
  };
}
