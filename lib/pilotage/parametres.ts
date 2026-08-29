// lib/pilotage/parametres.ts
//
// CE QUI FAIT TOURNER LES APP ET CIRCULER L'ARGENT (Béné, 29 août 2026).
//
// -- CE QUE CETTE SECTION MONTRE, ET CE QU'ELLE NE MONTRE JAMAIS ------
//
// Elle dit qu'une clé est POSÉE ou ABSENTE, et ce qui ne marche pas sans
// elle. Elle n'affiche JAMAIS sa valeur. Un écran se photographie, se
// partage, se laisse ouvert : c'est la même règle que les IBAN des
// affiliés (25 août) et que tous les contrôles de ce dépôt.
//
// Les seules valeurs lisibles sont celles qui rendent un diagnostic
// évident et qui ne sont pas des secrets : une adresse, un identifiant
// de projet Supabase (il est dans l'URL publique), un MODE (réel ou
// test).
//
// -- ET ELLE LIT LE PROCESSUS, PAS LE FICHIER -------------------------
//
// `npm run check:prod` lit le `.env` du dépôt. C'est utile et ce n'est
// pas la même question. Le 22 août, les deux `.env` étaient JUSTES et
// les deux apps servaient quand même la base de l'autre : la valeur
// fausse venait du terminal, poussée dans le processus par
// `pm2 restart --update-env`. Un contrôle qui lit le fichier ne voit
// pas ça. Celui-ci lit ce que l'app a VRAIMENT sous la main.
//
// -- LES CONTRADICTIONS SONT LE VRAI SUJET ----------------------------
//
// Une variable absente se voit. Ce qui ne se voit pas, c'est une
// combinaison qui a l'air complète et qui ne peut pas marcher : une clé
// Stripe secrète sans clé publiable (le formulaire de paiement reste
// vide, personne ne peut payer), une clé en réel sans secret de webhook
// (l'argent rentre, aucun accès ne s'ouvre). Ces règles existaient dans
// une commande que personne ne lance.
//
// PUR : l'appelant apporte les valeurs déjà lues.

export type Groupe = "base" | "emails" | "paiement" | "systeme-io" | "liaisons" | "fichiers";

export const NOM_GROUPE: Readonly<Record<Groupe, string>> = {
  base: "La base et l'adresse de l'app",
  emails: "Les emails",
  paiement: "Les paiements pris chez nous",
  "systeme-io": "Les ventes Systeme.io",
  liaisons: "Les liaisons entre app",
  fichiers: "Les fichiers servis par le serveur",
};

export interface Reglage {
  nom: string;
  groupe: Groupe;
  /** Sans elle, qu'est-ce qui ne marche pas. Jamais "requise", ça n'aide personne. */
  sansElle: string;
  /** Une absence bloque l'app, ou seulement une fonctionnalité. */
  requis: boolean;
  /** Les autres noms sous lesquels le code accepte la MÊME valeur. */
  aussi?: readonly string[];
}

/**
 * L'INVENTAIRE.
 *
 * `scripts/check-prod.mjs` a le sien : il lit les fichiers `.env` et
 * compare les dépôts voisins, ce que cette page ne peut pas faire depuis
 * un serveur. Les deux listes ne peuvent donc pas fusionner, mais elles
 * ne doivent pas DIVERGER : le test exige que toute variable contrôlée
 * par le script figure ici. Une clé ajoutée là-bas et oubliée ici
 * disparaîtrait de l'écran sans que personne le remarque.
 */
export const REGLAGES: readonly Reglage[] = [
  {
    nom: "NEXT_PUBLIC_SUPABASE_URL",
    groupe: "base",
    requis: true,
    sansElle: "L'app ne démarre pas.",
  },
  {
    nom: "SUPABASE_SERVICE_ROLE_KEY",
    groupe: "base",
    requis: true,
    sansElle: "Aucune écriture serveur : ni accès ouvert, ni ticket enregistré.",
  },
  {
    nom: "NEXT_PUBLIC_APP_URL",
    groupe: "base",
    requis: true,
    sansElle:
      "Les liens envoyés par email pointent ailleurs. Doit valoir https://quiz.tipote.com.",
  },
  {
    nom: "RESEND_API_KEY",
    groupe: "emails",
    requis: true,
    sansElle: "Aucun lien de connexion, aucune réponse de support, aucune alerte.",
  },
  {
    nom: "STRIPE_SECRET_KEY_OWNER",
    groupe: "paiement",
    requis: false,
    sansElle: "Le bon de commande ne s'ouvre pas du tout.",
  },
  {
    nom: "STRIPE_PUBLISHABLE_KEY_OWNER",
    groupe: "paiement",
    requis: false,
    aussi: ["NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_OWNER"],
    sansElle: "Le formulaire de paiement reste vide : personne ne peut payer par carte.",
  },
  {
    nom: "STRIPE_WEBHOOK_SECRET_OWNER",
    groupe: "paiement",
    requis: false,
    sansElle: "Une vente n'ouvre AUCUN accès.",
  },
  {
    nom: "PAYPAL_CLIENT_ID_OWNER",
    groupe: "paiement",
    requis: false,
    sansElle: "Pas de bouton PayPal du tout.",
  },
  {
    nom: "PAYPAL_SECRET_OWNER",
    groupe: "paiement",
    requis: false,
    sansElle: "Le bouton PayPal s'affiche et le paiement échoue.",
  },
  {
    nom: "PAYPAL_ENV_OWNER",
    groupe: "paiement",
    requis: false,
    sansElle:
      "Absente, PayPal tourne en bac à sable : des identifiants réels y sont refusés, "
      + "et le message ne dit pas pourquoi.",
  },
  {
    nom: "PAYPAL_WEBHOOK_ID_OWNER",
    groupe: "paiement",
    requis: false,
    sansElle: "Une vente PayPal n'ouvre aucun accès. npm run paypal:setup le crée.",
  },
  {
    nom: "SALES_PREVIEW_TOKEN",
    groupe: "paiement",
    requis: false,
    sansElle: "Le bon de commande répond 404 sur quiz.tipote.com.",
  },
  {
    nom: "SYSTEME_IO_WEBHOOK_SECRET",
    groupe: "systeme-io",
    requis: false,
    sansElle: "Les ventes Systeme.io n'ouvrent plus d'accès.",
  },
  {
    nom: "SYSTEME_IO_FREE_WEBHOOK_SECRET",
    groupe: "systeme-io",
    requis: false,
    sansElle: "Les inscriptions gratuites ne créent plus de compte.",
  },
  {
    nom: "PARTNER_SHARED_SECRET",
    groupe: "liaisons",
    requis: false,
    sansElle:
      "L'Atelier et l'espace affilié n'apparaissent nulle part : leurs élèves, leurs ventes "
      + "et leurs commissions manquent à tous les totaux.",
  },
  {
    nom: "AFFILIATE_INTERNAL_SECRET",
    groupe: "liaisons",
    requis: false,
    sansElle: "Aucune commission d'affiliation n'est enregistrée.",
  },
  {
    nom: "SEPA_DEBTOR_IBAN",
    groupe: "liaisons",
    requis: false,
    sansElle:
      "Le fichier de virement des affiliés n'est pas produit. La liste PayPal, elle, "
      + "se télécharge quand même.",
  },
  {
    nom: "NEXT_PUBLIC_ASSETS_BASE_URL",
    groupe: "fichiers",
    requis: false,
    sansElle: "Les images continuent d'aller chez Supabase, exactement comme avant.",
  },
  {
    nom: "ASSETS_DIR",
    groupe: "fichiers",
    requis: false,
    sansElle: "Le dossier par défaut du code est utilisé, servi par nginx.",
  },
];

/**
 * Une valeur qu'on ne montre JAMAIS.
 *
 * `CLIENT_ID` en fait partie : dans notre intégration PayPal il ne quitte
 * jamais le serveur, donc aucun écran n'a de raison de l'imprimer.
 * `WEBHOOK_ID` reste visible, c'est un identifiant qu'on recopie depuis
 * PayPal et le voir est exactement ce qui rend un diagnostic évident.
 */
export function estSecret(nom: string): boolean {
  return /(_KEY|_SECRET|_TOKEN|PASSWORD|CLIENT_ID|SERVICE_ROLE|IBAN)/i.test(String(nom ?? ""));
}

export interface EtatReglage extends Reglage {
  pose: boolean;
  /** La valeur, UNIQUEMENT quand ce n'est pas un secret. Sinon `null`. */
  valeur: string | null;
}

/** Ce que le processus a vraiment sous la main, sans jamais rendre un secret. */
export function lireReglages(
  env: Readonly<Record<string, string | undefined>>,
): EtatReglage[] {
  return REGLAGES.map((r) => {
    const noms = [r.nom, ...(r.aussi ?? [])];
    const brut = noms.map((n) => String(env[n] ?? "").trim()).find((v) => v.length > 0) ?? "";
    return {
      ...r,
      pose: brut.length > 0,
      valeur: brut && !estSecret(r.nom) ? brut : null,
    };
  });
}

// ── LES MODES, QUI NE SONT PAS DES SECRETS ───────────────────────────

export type Mode = "reel" | "test" | "absent" | "illisible";

/**
 * Stripe tourne-t-il en réel ou en test ?
 *
 * Le préfixe le dit, et c'est tout ce qu'on lit. `rk_` est une clé
 * RESTREINTE, acceptée par le code au même titre que `sk_` : ne tester
 * que `sk_live` laissait passer un compte en conditions réelles sans que
 * le contrôle s'en aperçoive.
 */
export function modeStripe(cle: string | undefined | null): Mode {
  const v = String(cle ?? "").trim();
  if (!v) return "absent";
  if (/^(sk|rk|pk)_live_/.test(v)) return "reel";
  if (/^(sk|rk|pk)_test_/.test(v)) return "test";
  return "illisible";
}

/** PayPal : absente vaut BAC À SABLE, et ce n'est pas un détail. */
export function modePaypal(valeur: string | undefined | null): Mode {
  const v = String(valeur ?? "").trim().toLowerCase();
  if (!v) return "test";
  if (v === "live") return "reel";
  if (v === "sandbox") return "test";
  return "illisible";
}

// ── LES CONTRADICTIONS ───────────────────────────────────────────────

export interface Contradiction {
  cle: string;
  /** Ce qui se passe VRAIMENT, en clair. */
  texte: string;
  /** Est-ce que de l'argent est en jeu tout de suite. */
  grave: boolean;
}

/**
 * Les combinaisons qui ont l'air complètes et qui ne peuvent pas marcher.
 *
 * Chacune de ces règles vit déjà dans `npm run check:prod`, c'est à dire
 * dans une commande que personne ne lance. Les mettre à l'écran est tout
 * l'intérêt : une variable absente se voit, une combinaison incohérente
 * ne se voit qu'à la première vente perdue.
 */
export function contradictions(
  env: Readonly<Record<string, string | undefined>>,
): Contradiction[] {
  const out: Contradiction[] = [];
  const lire = (n: string) => String(env[n] ?? "").trim();

  const stripeSecret = lire("STRIPE_SECRET_KEY_OWNER");
  const stripePubliable =
    lire("STRIPE_PUBLISHABLE_KEY_OWNER") || lire("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_OWNER");
  const stripeMode = modeStripe(stripeSecret);
  const paypalPose = lire("PAYPAL_CLIENT_ID_OWNER") && lire("PAYPAL_SECRET_OWNER");
  const paypalMode = modePaypal(lire("PAYPAL_ENV_OWNER"));

  if (stripeSecret && !stripePubliable) {
    out.push({
      cle: "stripe-publiable",
      texte:
        "La clé Stripe secrète est posée et la clé publiable manque. Le bon de commande "
        + "s'ouvre, le formulaire de paiement reste vide : personne ne peut payer par carte.",
      grave: true,
    });
  }

  if (stripeMode === "reel" && !lire("STRIPE_WEBHOOK_SECRET_OWNER")) {
    out.push({
      cle: "stripe-webhook",
      texte:
        "Stripe est en RÉEL et le secret du webhook manque. Le paiement se refuse tout seul, "
        + "et c'est voulu : sinon un abonnement serait prélevé en face d'aucun accès.",
      grave: true,
    });
  }

  if (paypalPose && paypalMode === "reel" && !lire("PAYPAL_WEBHOOK_ID_OWNER")) {
    out.push({
      cle: "paypal-webhook",
      texte:
        "PayPal est en RÉEL et l'identifiant de webhook manque. Le paiement se refuse tout "
        + "seul, pour la même raison. npm run paypal:setup le crée.",
      grave: true,
    });
  }

  if (paypalPose && stripeMode === "reel" && paypalMode === "test") {
    out.push({
      cle: "modes-melanges",
      texte:
        "Stripe est en RÉEL et PayPal en bac à sable. L'écran annonce un seul mode : "
        + "un des deux boutons ment.",
      grave: true,
    });
  }

  if (stripeSecret && stripeMode === "illisible") {
    out.push({
      cle: "stripe-illisible",
      texte:
        "La clé Stripe ne commence ni par sk_, ni par rk_, ni par pk_ : on ne peut pas dire "
        + "si elle est en réel ou en test.",
      grave: false,
    });
  }

  return out;
}
