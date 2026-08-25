"use client";

// app/commande/[produit]/CommandeClient.tsx
//
// LE FORMULAIRE DE PAIEMENT, DANS NOTRE PAGE.
//
// Stripe s'affiche à l'intérieur, dans un cadre isolé qui reçoit le
// numéro de carte sans qu'il passe jamais par notre serveur. Tout ce qui
// l'entoure est à nous : le prix, la garantie, la promesse.
//
// -- UN ÉCHEC PRODUIT TOUJOURS QUELQUE CHOSE À L'ÉCRAN -----------------
//
// Règle du 3 août. Ici elle compte double : quelqu'un qui veut payer et
// qui voit un cadre vide ne se dit pas "le serveur a un problème", il se
// dit "ça ne marche pas" et il part. Chaque raison renvoyée par le
// serveur a donc sa phrase, en français, avec ce qu'il y a à faire.

import { useCallback, useEffect, useMemo, useState } from "react";

import ChampsFacturation, {
  ACHETEUR_FORM_VIDE,
  type ChampsAcheteur,
} from "@/components/facturation/ChampsFacturation";
import { manques } from "@/lib/facture/identite";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";

import { readSaFromBrowser } from "@/lib/affiliate/sa";
import { readRefFromBrowser } from "@/lib/affiliate/refLien";

/** Les raisons du serveur, traduites ici et nulle part ailleurs. */
const RAISONS: Record<string, string> = {
  not_found: "Ce bon de commande n'est pas ouvert.",
  unknown_product: "Ce produit n'existe pas.",
  not_configured:
    "Le paiement n'est pas encore branché sur ce serveur. Rien n'a été débité.",
  tax_not_enabled:
    "La TVA automatique n'est pas activée sur le compte Stripe. Rien n'a été débité.",
  stripe_refused: "Stripe a refusé d'ouvrir le paiement. Rien n'a été débité.",
  network: "La connexion a coupé avant d'ouvrir le paiement. Rien n'a été débité.",
  live_without_webhook:
    // CE QUI MANQUE VRAIMENT, ET PLUS CE QUI MANQUAIT EN AOUT.
    // L'ouverture des acces EST branchee depuis le 22 aout. Ce qui
    // bloque desormais, c'est le secret du webhook : sans lui, rien ne
    // peut valider la confirmation de Stripe, donc un abonnement serait
    // preleve chaque mois en face de rien. Un message perime envoie
    // chercher au mauvais endroit, c'est la faute qu'on repare depuis
    // trois jours.
    "Le paiement en conditions réelles est fermé : la clé STRIPE_WEBHOOK_SECRET_OWNER n'est pas posée sur le serveur. Sans elle, un abonnement serait prélevé sans ouvrir aucun accès. Rien n'a été débité.",
  invalid_body: "Requête illisible.",
};

/**
 * Ce qui manque, dit en français et pas en noms de champs.
 *
 * "Il manque nom, ville" enverrait chercher une case appelée "ville".
 * Le serveur renvoie des RAISONS, l'écran dit comment les dire : c'est
 * la règle de la suppression d'un quiz (3 août) et de l'import PDF
 * (7 août), appliquée ici.
 */
const MOTS_MANQUES: Record<string, string> = {
  nom: "ton nom",
  adresse: "ton adresse",
  ville: "ton code postal et ta ville",
  pays: "ton pays",
};

function LIBELLE_MANQUES(codes: string[]): string {
  const mots = codes.map((c) => MOTS_MANQUES[c] ?? c);
  if (mots.length === 1) return mots[0];
  return `${mots.slice(0, -1).join(", ")} et ${mots[mots.length - 1]}`;
}

/** Les raisons propres à PayPal, avec la même règle : jamais un cadre muet. */
const RAISONS_PAYPAL: Record<string, string> = {
  not_configured: "Le compte PayPal n'est pas branché sur ce serveur. Rien n'a été débité.",
  invalid_email: "Cette adresse email ne semble pas valide.",
  invalid_product: "Ce palier ne peut pas être vendu en abonnement PayPal.",
  paypal_refused: "PayPal a refusé d'ouvrir le paiement. Rien n'a été débité.",
  no_approval_link: "PayPal n'a pas renvoyé de page de paiement. Rien n'a été débité.",
  live_without_webhook:
    "Le paiement PayPal est bloqué tant que l'ouverture automatique des accès n'est pas branchée. Rien n'a été débité.",
  network: "La connexion à PayPal a échoué. Rien n'a été débité.",
};

export default function CommandeClient({
  paypalDisponible = false,
  produit,
  cle,
  clePublique,
  modesDiscordants = false,
}: {
  produit: string;
  cle: string;
  clePublique: string | null;
  /** Clé secrète et clé publiable pas dans le même monde (live vs test). */
  modesDiscordants?: boolean;
  /** Le compte PayPal de Béné est branché sur ce serveur. */
  paypalDisponible?: boolean;
}) {
  const [erreur, setErreur] = useState<string | null>(null);
  const [mode, setMode] = useState<string | null>(null);

  // ── LE CODE DE RÉDUCTION D'UN AFFILIÉ (Béné, 25 août 2026) ─────────
  //
  // "Ne sera valable que sur le lien de l'affilié." Il arrive donc par
  // l'URL dans le cas normal (l'affiliée partage UN lien qui porte son
  // `?ref=` et son `?code=`), et le champ juste en dessous rattrape
  // celui qui a lu le code dans une vidéo et cliqué un lien plus ancien.
  //
  // On le lit APRÈS le montage, pas pendant : `window` n'existe pas au
  // rendu serveur, et une valeur lue trop tôt casserait l'hydratation.
  const [codeSaisi, setCodeSaisi] = useState("");
  const [codeApplique, setCodeApplique] = useState("");
  const [remise, setRemise] = useState<{
    code: string;
    jours: number;
    joursDeBase: number;
    percentOff: number | null;
    duree: string | null;
    mois: number | null;
    apresEssai: boolean;
  } | null>(null);
  const [remiseRefusee, setRemiseRefusee] = useState<string | null>(null);

  useEffect(() => {
    const depuisUrl = new URLSearchParams(window.location.search).get("code") ?? "";
    const propre = depuisUrl.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 40);
    if (propre) {
      setCodeSaisi(propre);
      setCodeApplique(propre);
    }
  }, []);
  const [emailPaypal, setEmailPaypal] = useState("");
  const [paypalEnCours, setPaypalEnCours] = useState(false);
  const [erreurPaypal, setErreurPaypal] = useState<string | null>(null);
  // LES INFOS DE FACTURATION, DEMANDÉES AVANT PAYPAL.
  //
  // Stripe les collecte lui même (`billing_address_collection: required`
  // + la case entreprise). PayPal ne demande rien et ne nous rend rien
  // d'exploitable : sans ce bloc, une vente PayPal n'a AUCUNE adresse,
  // donc aucune facture opposable. Les deux moyens de paiement doivent
  // produire la même pièce comptable.
  const [facturation, setFacturation] = useState<ChampsAcheteur>(ACHETEUR_FORM_VIDE);

  // La clé publiable est indispensable au navigateur. Sans elle, le cadre
  // resterait vide sans dire pourquoi : on le dit, et on distingue les
  // deux causes, parce qu'elles n'appellent pas le même geste.
  useEffect(() => {
    if (modesDiscordants) {
      setErreur(
        "Les deux clés Stripe de ce serveur ne sont pas du même type : l'une est en conditions réelles, l'autre en test. Le formulaire reste fermé tant que les deux ne concordent pas.",
      );
      return;
    }
    if (!clePublique) {
      setErreur(
        "La clé publique Stripe n'est pas posée sur ce serveur. Le formulaire ne peut pas s'afficher.",
      );
    }
  }, [clePublique, modesDiscordants]);

  // ── L'AFFILIÉE QUI A ENVOYÉ CETTE ACHETEUSE ──
  //
  // Lu AU MOMENT DE L'APPEL, pas dans un `useEffect`, et c'est le coeur
  // du sujet.
  //
  // Un effet de CE composant s'exécute APRÈS les effets de ses enfants :
  // le fournisseur Stripe aurait donc déjà appelé `fetchClientSecret`
  // avant que l'identifiant soit connu, et la commission serait perdue
  // sans que rien ne s'affiche de travers. Et le mettre dans un état
  // changerait l'identité de la fonction, donc remonterait le formulaire
  // de paiement au premier rendu.
  //
  // DEUX GÉNÉRATIONS DE LIENS, DEUX CHAMPS. `ref` = notre code public
  // (tous nos liens depuis le 24 août), `sa` = un ancien tunnel
  // Systeme.io, qui reste valide. Ils partent SÉPARÉMENT : le serveur
  // n'a alors rien à deviner.
  const refAffiliee = useCallback(
    () => readRefFromBrowser(window.location.search, document.cookie) ?? undefined,
    [],
  );
  const saAffiliee = useCallback(
    () => readSaFromBrowser(window.location.search, document.cookie) ?? undefined,
    [],
  );


  // ── LE BLOC "CODE DE RÉDUCTION" ────────────────────────────────────
  //
  // Il est rendu AU DESSUS du paiement, jamais dedans : appliquer un
  // code remonte le formulaire Stripe (la session porte le prix, donc
  // elle est recréée), et on ne remonte pas un formulaire de carte sous
  // les doigts de quelqu'un qui est en train de le remplir.
  //
  // Le serveur renvoie une RAISON, l'écran la met en mots : c'est la
  // règle du 3 août (un `ok: false` produit toujours quelque chose à
  // l'écran) et celle du 7 août (le serveur dit ce qui s'est passé,
  // l'interface dit comment le dire).
  const PHRASES_REFUS: Record<string, string> = {
    "mauvais-lien":
      "Ce code ne marche qu'avec le lien de la personne qui te l'a donné. Reprends son lien, puis reviens ici.",
    inconnu: "Ce code n'existe pas. Vérifie qu'il est bien recopié.",
    desactive: "Ce code n'est plus actif.",
    expire: "Ce code a expiré.",
    "produit-exclu": "Ce code ne s'applique pas à cette formule.",
    "remise-illisible": "Ce code n'est pas exploitable. Écris-nous, on le règle.",
    indisponible:
      "On n'a pas pu vérifier ce code à l'instant. Réessaie dans une minute, ton code n'est pas perdu.",
    "pas-encore": "Ce code n'est pas encore ouvert. Reviens à la date annoncée.",
    "essai-refuse":
      "Ce code offre des jours d'essai, et l'essai gratuit ne peut être ouvert qu'une fois par personne. Ta commande passe au tarif normal.",
  };

  // La durée d'une remise, en mots. Une remise "à vie" et une remise sur
  // une échéance ne se disent pas pareil, et l'acheteur doit savoir
  // laquelle il a avant de payer.
  const dureeEnMots = (r: { duree: string | null; mois: number | null }) =>
    r.duree === "forever"
      ? "sur toutes tes échéances"
      : r.duree === "months" && r.mois
        ? `pendant ${r.mois} mois`
        : "sur ta première échéance payée";

  const blocCode = (
    <div className="mb-4 rounded-lg border p-3">
      <label htmlFor="code-reduction" className="text-sm font-medium">
        Tu as un code de réduction ?
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="code-reduction"
          type="text"
          value={codeSaisi}
          onChange={(e) =>
            setCodeSaisi(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 40))
          }
          placeholder="TONCODE"
          className="w-full rounded-md border px-3 py-2 font-mono text-sm uppercase"
        />
        <button
          type="button"
          onClick={() => setCodeApplique(codeSaisi.trim())}
          disabled={!codeSaisi.trim() || codeSaisi.trim() === codeApplique}
          className="shrink-0 rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Appliquer
        </button>
      </div>
      {remise && (
        <p className="mt-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
          {/* TROIS PHRASES, parce qu'il y a trois avantages possibles et
              qu'une seule phrase mentirait sur deux d'entre eux. Ce qui
              est annoncé est ce qui sera FACTURÉ : le serveur rend
              l'avantage tel qu'il sera appliqué, pas ce qui a été saisi. */}
          Code {remise.code} appliqué :{" "}
          {remise.percentOff === null
            ? `${remise.jours} jours offerts au lieu de ${remise.joursDeBase}.`
            : remise.apresEssai
              ? `${remise.jours} jours offerts, puis -${remise.percentOff} % ${dureeEnMots(remise)}.`
              : `-${remise.percentOff} % ${dureeEnMots(remise)}.`}
        </p>
      )}
      {!remise && remiseRefusee && (
        <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
          {PHRASES_REFUS[remiseRefusee] ?? PHRASES_REFUS.inconnu}
        </p>
      )}
    </div>
  );

  const fetchClientSecret = useCallback(async () => {
    const r = await fetch("/api/commande/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        produit,
        k: cle,
        ref: refAffiliee(),
        sa: saAffiliee(),
        code: codeApplique || undefined,
      }),
    });
    const data = (await r.json().catch(() => ({}))) as {
      ok?: boolean;
      clientSecret?: string;
      reason?: string;
      mode?: string;
      remise?: {
        code: string;
        jours: number;
        joursDeBase: number;
        percentOff: number | null;
        duree: string | null;
        mois: number | null;
        apresEssai: boolean;
      } | null;
      remiseRefusee?: string | null;
    };
    if (!data.ok || !data.clientSecret) {
      const phrase = RAISONS[data.reason ?? ""] ?? "Le paiement n'a pas pu s'ouvrir.";
      setErreur(phrase);
      // Stripe attend une promesse résolue : on lève pour ne pas monter
      // un formulaire vide par dessus le message d'erreur.
      throw new Error(data.reason ?? "checkout_failed");
    }
    if (data.mode) setMode(data.mode);
    // Le serveur a tranché : c'est LUI qui dit si le code s'applique, et
    // avec quelle remise. Le navigateur n'a fait que transmettre ce qui
    // a été tapé.
    setRemise(data.remise ?? null);
    setRemiseRefusee(data.remiseRefusee ?? null);
    return data.clientSecret;
  }, [produit, cle, refAffiliee, saAffiliee, codeApplique]);

  // `loadStripe` rend une NOUVELLE promesse a chaque appel. Appelee dans
  // le JSX, elle en fabriquerait une par rendu, et le fournisseur Stripe
  // se remonterait a chaque fois : formulaire qui clignote, champs vides
  // au milieu d'une saisie. On la garde stable.
  const stripePromise = useMemo(
    () => (clePublique ? loadStripe(clePublique) : null),
    [clePublique],
  );

  // ── PAYPAL ──
  //
  // Beaucoup de gens n'ont pas envie de sortir leur carte et paient en
  // PayPal ou pas du tout. Un bon de commande sans PayPal, ce ne sont
  // pas des ventes qui passent ailleurs, ce sont des ventes qui ne se
  // font pas.
  //
  // L'ADRESSE EST DEMANDÉE ICI, et c'est la différence avec Stripe.
  // Stripe la collecte dans son formulaire ; PayPal emmène l'acheteur
  // chez lui et nous rendra l'adresse de SON COMPTE PayPal, qui n'est
  // pas toujours celle qu'il utilise chez nous. Ouvrir l'accès sur
  // celle-là fabriquerait un compte orphelin, ce que l'Atelier a
  // rencontré le 7 août sur les commandes de bonus.
  async function partirSurPaypal() {
    if (paypalEnCours) return;
    const adresse = emailPaypal.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adresse)) {
      setErreurPaypal("Indique l'adresse email sur laquelle tu veux recevoir tes accès.");
      return;
    }
    // On vérifie AVANT d'ouvrir PayPal : réclamer une adresse à
    // quelqu'un qui vient de payer est le meilleur moyen de ne jamais
    // l'obtenir. `manques()` est la MÊME fonction que celle qui décide,
    // à l'émission, si la facture est complète.
    const incomplet = manques({ ...facturation, email: adresse });
    if (incomplet.length > 0) {
      setErreurPaypal(
        "Il manque " + LIBELLE_MANQUES(incomplet) + " : la facture ne serait pas valable sans.",
      );
      return;
    }
    setErreurPaypal(null);
    setPaypalEnCours(true);
    try {
      const r = await fetch("/api/commande/paypal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Le code part AUSSI par ici : un code qui marche par carte et pas
        // par PayPal, c'est un bon de commande qui ment sur l'un des deux.
        body: JSON.stringify({ produit, email: adresse, k: cle, ref: refAffiliee(), sa: saAffiliee(), code: codeApplique || undefined, facturation }),
      });
      const data = (await r.json().catch(() => ({}))) as {
        ok?: boolean;
        approveUrl?: string;
        reason?: string;
      };
      if (data.ok && data.approveUrl) {
        window.location.assign(data.approveUrl);
        return;
      }
      setErreurPaypal(
        RAISONS_PAYPAL[data.reason ?? ""] ?? "PayPal n'a pas pu ouvrir le paiement.",
      );
    } catch {
      setErreurPaypal("La connexion a coupé avant d'ouvrir PayPal. Rien n'a été débité.");
    } finally {
      setPaypalEnCours(false);
    }
  }

  // UNE PANNE DE CARTE NE DOIT PAS EMPORTER PAYPAL.
  //
  // Une clé Stripe absente faisait disparaître tout le composant, donc
  // l'acheteur se retrouvait devant une page sans AUCUN moyen de payer
  // alors qu'il en restait un qui marchait. Deux moyens de paiement,
  // deux sorts indépendants : ce bloc est rendu dans toutes les
  // branches, y compris celle de l'erreur.
  const blocPaypal = paypalDisponible ? (
    <div className="mt-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          ou
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <label className="mb-2 block text-sm font-medium">
        Ton adresse email
        <input
          type="email"
          value={emailPaypal}
          onChange={(e) => setEmailPaypal(e.target.value)}
          placeholder="celle qui recevra tes accès"
          className="mt-1 w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </label>
      <div className="mb-4 mt-4">
        <p className="mb-2 text-sm font-semibold">Informations de facturation</p>
        <ChampsFacturation valeur={facturation} onChange={setFacturation} />
      </div>
      <button
        type="button"
        onClick={() => void partirSurPaypal()}
        disabled={paypalEnCours}
        className="w-full rounded-lg border bg-card px-4 py-3 text-sm font-bold transition hover:bg-muted disabled:cursor-wait disabled:opacity-60"
      >
        {paypalEnCours ? "Ouverture de PayPal..." : "Payer avec PayPal"}
      </button>
      {erreurPaypal && (
        <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-900">{erreurPaypal}</p>
      )}
    </div>
  ) : null;

  if (erreur) {
    return (
      <div>
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-900">
        <p className="font-semibold">Le paiement n&apos;a pas pu s&apos;ouvrir.</p>
        <p className="mt-1">{erreur}</p>
      </div>
      {blocCode}
      {blocPaypal}
      </div>
    );
  }

  if (!clePublique) return <div>{blocCode}{blocPaypal}</div>;

  return (
    <div>
      {mode === "test" && (
        <p className="mb-3 rounded-md bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-900">
          Mode test : aucun argent ne circule, aucune carte n&apos;est débitée.
        </p>
      )}
      {blocCode}
      {/* `key` : appliquer un code crée une NOUVELLE session de paiement
          (c'est elle qui porte le prix). Sans ce remontage, le formulaire
          garderait l'ancienne et facturerait le prix plein derrière un
          code affiché comme appliqué. */}
      <EmbeddedCheckoutProvider
        key={codeApplique || "sans-code"}
        stripe={stripePromise}
        options={{ fetchClientSecret }}
      >
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>

      {/* ET DANS CETTE BRANCHE AUSSI, qui est la seule que voit un
          acheteur quand tout va bien.

          Bene, 23 aout : "je ne vois pas paypal sur mon bon de commande
          test. Uniquement Stripe." Le bloc etait rendu dans la branche
          d'erreur et dans celle sans cle Stripe, et OUBLIE dans celle
          la. C'est le meme defaut que le `poseSa` du middleware : un
          bloc conditionnel recopie dans chaque `return`, et celui qui
          compte est celui qu'on oublie. Le test compte les branches. */}
      {blocPaypal}

      {/* ── CE QUE LES CGV PROMETTENT, ET QUE L'ÉCRAN NE FAISAIT PAS ──
          Nos CGV disent, à l'article 5 : "Cette renonciation est
          recueillie avant paiement." Le bon de commande n'affichait
          RIEN : ni les CGV, ni la renonciation. Les conditions
          annonçaient donc quelque chose que l'interface ne faisait pas,
          ce qui les rend inopposables sur ce point précis.

          C'est la moitié de décision qui revient : un texte d'un côté,
          un écran de l'autre, et personne pour vérifier qu'ils disent la
          même chose.

          Les liens s'ouvrent dans un nouvel onglet : partir lire les CGV
          ne doit pas faire perdre un paiement en cours. */}
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        En payant, tu acceptes les{" "}
        <a
          href="/terms"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold underline"
        >
          Conditions générales de vente
        </a>{" "}
        et la{" "}
        <a
          href="/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold underline"
        >
          Politique de confidentialité
        </a>
        . Ton accès étant ouvert immédiatement, tu demandes l&apos;exécution du service avant
        la fin du délai de rétractation de 14 jours et tu renonces expressément à ce droit
        (articles L221-25 et L221-28 3° du Code de la consommation).
      </p>
    </div>
  );
}
