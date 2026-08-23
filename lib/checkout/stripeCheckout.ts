// lib/checkout/stripeCheckout.ts
//
// LE PAIEMENT DE NOS PROPRES VENTES, VIA L'API REST DE STRIPE.
//
// Pas de SDK serveur : ce dépôt encaisse déjà comme ça pour les
// revendeurs (`lib/stripeRest.ts`), et une dépendance de moins est une
// dépendance de moins à faire monter le jour d'un `npm ci`. Les deux
// paquets ajoutés (`@stripe/stripe-js`, `@stripe/react-stripe-js`) ne
// servent QUE côté navigateur, pour afficher le formulaire dans la page.
//
// Ce module est le JUMEAU de celui de l'Atelier. La différence tient en
// un mot : ici les produits sont des ABONNEMENTS (mode `subscription`),
// là-bas un achat unique. Le code gère les deux, c'est l'`interval` du
// catalogue qui tranche, jamais une devinette.
//
// -- LE FORMULAIRE RESTE DANS SA PAGE ----------------------------------
//
// `ui_mode: "embedded"` affiche le paiement DANS notre page, au lieu
// d'envoyer l'acheteur sur une page hébergée par Stripe. C'est la demande
// de Béné : "bon de commande pleine page", avec son habillage, sa
// garantie, ses témoignages autour. Une page de paiement aux couleurs de
// Stripe au milieu d'un tunnel qui est le sien, c'est une rupture, et une
// rupture dans un tunnel de vente se paie en abandons.
//
// -- LA TVA EST DANS LE PRIX, PAS AU DESSUS ----------------------------
//
// `tax_behavior: "inclusive"` + `automatic_tax`, et c'est exactement ce
// que Béné a demandé le 12 août : "je facture toujours TTC donc par
// exemple c'est 47€ TTC, la TVA doit donc calculer pour arriver à ce
// montant." Le client paie 47,00 € qu'il soit français, belge ou
// canadien ; c'est la part de TVA à l'intérieur qui change.
//
// ATTENTION, deux pièges de configuration, pas de code :
//   1. `automatic_tax` exige que **Stripe Tax soit activé** sur le compte.
//      Sans ça, Stripe refuse de créer la session. La route traduit ce
//      refus en une phrase exploitable au lieu de le laisser passer pour
//      une panne.
//   2. `tax_behavior` ne peut PLUS être changé une fois posé sur un prix.
//      Ici on crée le prix à la volée à chaque session, donc on n'est pas
//      coincé, mais la valeur doit être juste dès la première vente.

import crypto from "node:crypto";

import { STRIPE_BRANDING } from "@/lib/checkout/brand";
import type { OwnerProduct } from "@/lib/checkout/catalog";
import { OWNER_SUBSCRIPTION_EVENTS } from "@/lib/checkout/subscriptionLifecycle";

const STRIPE_API = "https://api.stripe.com";

/**
 * L'identifiant du client, quelle que soit la forme recue.
 *
 * Stripe renvoie soit la chaine `cus_...`, soit l'objet complet quand la
 * ressource est "etendue". Lire un seul des deux cas marcherait
 * aujourd'hui et casserait le jour ou on ajoute un `expand` : c'est
 * exactement la lecon du drame Ivan, ou on raisonnait sur la forme
 * SUPPOSEE d'un payload.
 */
export function readCustomerId(v: unknown): string | null {
  if (typeof v === "string") return v.trim() || null;
  if (v && typeof v === "object") {
    const id = (v as { id?: unknown }).id;
    if (typeof id === "string") return id.trim() || null;
  }
  return null;
}

/** Les événements qui nous intéressent sur une vente à nous. */
export const OWNER_STRIPE_EVENTS = [
  "checkout.session.completed",
  // Un paiement différé (virement, prélèvement) se confirme APRÈS la
  // session. Sans cet événement, ces ventes n'ouvriraient jamais l'accès.
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  // Le remboursement. Sans lui, un abonne rembourse garde son plan payant.
  "charge.refunded",
  // LE CYCLE DE VIE DE L'ABONNEMENT, AJOUTE LE 21 AOUT.
  //
  // Sans ces quatre la, un client qui resilie garde son plan payant
  // indefiniment, un renouvellement qui echoue ne coupe rien, et la
  // question "qui est parti" n'a aucune donnee derriere. Voir
  // `lib/checkout/subscriptionLifecycle.ts` pour qui coupe quoi, et
  // surtout pour ce qui NE coupe PAS.
  ...OWNER_SUBSCRIPTION_EVENTS,
] as const;

function toForm(obj: Record<string, string | number>): string {
  return Object.entries(obj)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
}

/**
 * Les raisons qu'on renvoie à l'écran.
 *
 * Le serveur dit ce qui s'est passé, l'interface sait comment le dire :
 * même règle que la suppression d'un quiz (3 août) et que l'import PDF
 * (7 août). Ici elle compte double, parce que le message par défaut de
 * Stripe est en anglais et parle à un développeur.
 */
export type CheckoutFailure =
  | "not_configured"
  | "unknown_product"
  | "tax_not_enabled"
  | "stripe_refused"
  | "network";

export interface CheckoutSessionResult {
  ok: boolean;
  clientSecret?: string;
  reason?: CheckoutFailure;
  /** Le message brut de Stripe, pour le journal du serveur. JAMAIS affiché. */
  detail?: string;
}

/**
 * Reconnaît le refus "Stripe Tax n'est pas activé".
 *
 * On ne se fie pas au code d'erreur seul : Stripe le formule de plusieurs
 * façons selon l'endroit du compte où ça bloque. Un faux positif ici ne
 * coûte qu'une phrase d'aide un peu à côté ; un faux négatif renverrait
 * Béné chercher un bug dans le code alors que tout se règle en deux clics
 * dans son tableau de bord.
 */
export function looksLikeTaxNotEnabled(message: string | null | undefined): boolean {
  const m = String(message ?? "").toLowerCase();
  if (!m) return false;
  return (
    m.includes("automatic_tax") ||
    m.includes("stripe tax") ||
    (m.includes("tax") && (m.includes("not been activated") || m.includes("not enabled") || m.includes("must be active")))
  );
}

/**
 * Crée la session de paiement et renvoie le secret que le navigateur
 * utilisera pour afficher le formulaire.
 *
 * `product` vient du catalogue, jamais du navigateur : le prix et ce que
 * la vente ouvre sont décidés côté serveur. Un prix reçu du client serait
 * un prix négociable par le client.
 */
export async function createOwnerCheckoutSession(args: {
  key: string;
  product: OwnerProduct;
  /** Où Stripe renvoie l'acheteur. Doit contenir `{CHECKOUT_SESSION_ID}`. */
  returnUrl: string;
  /** Le code de l'affiliée, s'il y en a un. Voyage jusqu'à la commission. */
  affiliateRef?: string | null;
  /**
   * Les jours d'essai GRATUIT sur l'abonnement choisi.
   *
   * Béné, 23 août : "s'il prend mensuel il a 30j gratos à mensuel. S'il
   * prend mensuel plus : il a 30j gratos à mensuel plus." C'est
   * exactement ce que fait `trial_period_days` : le client choisit son
   * palier, il n'est pas prélevé pendant la période, puis il paie le
   * prix de CE palier.
   */
  trialDays?: number | null;
  /** Pré-remplit l'adresse quand on la connaît déjà. */
  email?: string | null;
}): Promise<CheckoutSessionResult> {
  if (!args.returnUrl.includes("{CHECKOUT_SESSION_ID}")) {
    // Sans ce gabarit, la page de retour ne saurait pas QUELLE vente elle
    // confirme, et afficherait un merci sans savoir de quoi.
    return { ok: false, reason: "not_configured", detail: "return_url sans {CHECKOUT_SESSION_ID}" };
  }

  const p = args.product;
  const abonnement = p.interval !== null;

  const params: Record<string, string | number> = {
    ui_mode: "embedded",
    mode: abonnement ? "subscription" : "payment",
    return_url: args.returnUrl,
    // Le formulaire parle la langue de l'acheteuse, pas celle de Stripe.
    locale: "fr",
    "line_items[0][quantity]": 1,
    "line_items[0][price_data][currency]": p.currency,
    "line_items[0][price_data][unit_amount]": p.amountCents,
    "line_items[0][price_data][tax_behavior]": "inclusive",
    "line_items[0][price_data][product_data][name]": p.label,
    "automatic_tax[enabled]": "true",
    // UNE VRAIE FACTURE EXIGE UNE VRAIE ADRESSE.
    //
    // Sans elle, Stripe ne collecte que le pays et le code postal, ce qui
    // suffit à calculer la TVA mais pas à émettre une facture opposable :
    // l'adresse de l'acheteur en est une mention obligatoire. Le prix à
    // payer est deux champs de plus dans le formulaire, et c'est un prix
    // qu'on paie volontiers pour ne pas avoir à refaire les factures à la
    // main derrière.
    billing_address_collection: "required",
    // LA CASE "JE SUIS UNE ENTREPRISE".
    //
    // Elle fait apparaître le champ numéro de TVA, et Stripe Tax en tire
    // les conséquences tout seul : autoliquidation pour une entreprise de
    // l'Union hors France, TVA française pour une entreprise française
    // (la loi ne permet pas de l'exonérer, ce n'est pas un réglage).
    "tax_id_collection[enabled]": "true",
    // Ce qu'on relira au retour ET dans le webhook pour ouvrir l'accès.
    // Le webhook fait foi ; le retour n'est qu'un affichage.
    "metadata[product]": p.id,
    "metadata[source]": p.source,
  };

  if (abonnement) {
    params["line_items[0][price_data][recurring][interval]"] = p.interval as string;
    params["subscription_data[metadata][product]"] = p.id;
    params["subscription_data[metadata][source]"] = p.source;
    if (args.affiliateRef) params["subscription_data[metadata][affiliate_ref]"] = args.affiliateRef;
    // L'ESSAI GRATUIT. Stripe n'accepte cette clé que sur un abonnement,
    // et c'est bien là qu'elle a un sens.
    const essai = Number(args.trialDays ?? 0);
    if (Number.isInteger(essai) && essai > 0 && essai <= 365) {
      params["subscription_data[trial_period_days]"] = String(essai);
      // Ce qui se passe si la carte tombe en défaut à la fin de l'essai.
      // `cancel` plutôt que `create_invoice` : on ne veut pas lancer un
      // impayé à quelqu'un qui a juste testé et changé d'avis.
      params["subscription_data[trial_settings][end_behavior][missing_payment_method]"] = "cancel";
      // ON ÉCRIT LE FAIT, ON NE LE DÉDUIRA PAS.
      //
      // Le webhook doit savoir qu'un mois a été offert pour le marquer
      // comme consommé. Le déduire d'un `sa` présent serait faux : un
      // `sa` peut être là sans qu'aucun essai n'ait été ouvert (personne
      // qui a déjà eu son mois, auto-affiliation refusée). Deviner
      // marquerait des cadeaux jamais faits.
      params["subscription_data[metadata][free_month_days]"] = String(essai);
    }
    // Un abonnement produit ses factures TOUT SEUL, à chaque échéance.
    // `invoice_creation` n'existe QUE pour le paiement unique, et
    // l'envoyer ici ferait refuser la session par Stripe.
  } else {
    // En paiement unique, Stripe ne crée un client que si on le demande.
    // Sans client, pas de reçu nominatif ni de facture rattachable.
    params.customer_creation = "always";
    // UN REÇU N'EST PAS UNE FACTURE.
    //
    // Constaté sur la première vraie vente du 20 août : l'acheteur a reçu
    // "Reçu de ETHILIFE n° 1879-1677". C'est une preuve de paiement, pas
    // une pièce comptable : ni numéro de facture, ni identité complète du
    // vendeur, ni adresse de l'acheteur. Un client professionnel ne peut
    // rien en faire.
    //
    // `invoice_creation` fait émettre par Stripe une VRAIE facture, avec
    // sa numérotation continue, envoyée par email après le paiement.
    // Elle est facturée à part par Stripe (0,4 % du montant, plafonné à
    // environ 2 € par facture, donc ~0,19 € sur une vente à 47 €).
    params["invoice_creation[enabled]"] = "true";
    // Le prix étant TTC, la facture doit montrer le montant payé et la
    // TVA CONTENUE dedans, pas un HT suivi d'une taxe qui s'ajoute.
    params["invoice_creation[invoice_data][rendering_options][amount_tax_display]"] =
      "include_inclusive_tax";
  }

  if (args.affiliateRef) params["metadata[affiliate_ref]"] = args.affiliateRef;
  if (args.email) params.customer_email = args.email;

  try {
    // UNE COULEUR NE DOIT JAMAIS EMPÊCHER D'ENCAISSER.
    //
    // `branding_settings` est ce qui donne au formulaire le fond clair et
    // l'indigo de la page, à la place du bleu nuit du compte Stripe. Mais
    // ses valeurs sont des énumérations chez Stripe : le jour où l'une
    // d'elles change de nom, la session serait REFUSÉE, et un habillage
    // ferait tomber la caisse. On réessaie donc une fois sans lui.
    let out = await postSession(args.key, { ...params, ...STRIPE_BRANDING });
    if (!out.ok && mentionneLHabillage(out.detail)) {
      console.error(
        `[commande] Stripe refuse l'habillage (${out.detail}) : on encaisse sans, le formulaire ` +
          `reprendra les couleurs du tableau de bord.`,
      );
      out = await postSession(args.key, params);
    }
    return out;
  } catch (e) {
    return { ok: false, reason: "network", detail: (e as Error).message };
  }
}

/** Le refus porte-t-il sur l'habillage, et sur lui seul ? */
function mentionneLHabillage(detail: string | undefined): boolean {
  return String(detail ?? "").toLowerCase().includes("branding_settings");
}

/** Un seul appel à Stripe, sans interprétation au delà du refus. */
async function postSession(
  key: string,
  params: Record<string, string | number>,
): Promise<CheckoutSessionResult> {
  const res = await fetch(`${STRIPE_API}/v1/checkout/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: toForm(params),
  });
  const json = (await res.json().catch(() => ({}))) as {
    client_secret?: string;
    error?: { message?: string };
  };
  if (!res.ok || !json.client_secret) {
    const detail = json.error?.message ?? `HTTP ${res.status}`;
    return {
      ok: false,
      reason: looksLikeTaxNotEnabled(detail) ? "tax_not_enabled" : "stripe_refused",
      detail,
    };
  }
  return { ok: true, clientSecret: json.client_secret };
}

/**
 * Vérifie la signature d'un événement Stripe, sans SDK.
 *
 * HMAC-SHA256 de `${timestamp}.${corps}`, comparaison à durée constante,
 * tolérance de 5 minutes contre le rejeu. Portée telle quelle depuis
 * `lib/stripeRest.ts` côté Tiquiz : c'est du code éprouvé en production,
 * et une vérification de signature n'est pas un endroit où improviser.
 */
export function verifyStripeSignature(
  rawBody: string,
  header: string | null | undefined,
  secret: string | null | undefined,
): boolean {
  if (!header || !secret) return false;
  let t = "";
  const v1: string[] = [];
  for (const part of String(header).split(",")) {
    const [k, val] = part.split("=");
    if (k === "t") t = val ?? "";
    else if (k === "v1" && val) v1.push(val);
  }
  if (!t || v1.length === 0) return false;

  const ts = Number(t);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;

  const expected = crypto.createHmac("sha256", secret).update(`${t}.${rawBody}`, "utf8").digest("hex");
  const expBuf = Buffer.from(expected, "hex");
  return v1.some((sig) => {
    const sigBuf = Buffer.from(sig, "hex");
    return sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
  });
}

export interface OwnerSessionInfo {
  paid: boolean;
  email: string | null;
  /** Le nom saisi au paiement, pour dire "Hey Gwenn" au lieu de "Hey". */
  name?: string | null;
  productId: string | null;
  affiliateRef: string | null;
  /** Les jours offerts sur cet abonnement, 0 s'il n'y en a pas. */
  freeMonthDays: number;
  /**
   * LE CLIENT STRIPE, ET IL FAUT LE GARDER.
   *
   * On l'a jete pendant tout le chantier, et c'est ce qui rendait
   * impossible le portail de facturation demande le 21 aout ("ils
   * veulent payer avec une autre carte ?"). Sans cet identifiant, on ne
   * peut pas dire a Stripe de qui on parle.
   *
   * L'adresse email ne peut pas le remplacer : elle change, et elle
   * n'est pas toujours celle du compte (une carte au nom du conjoint,
   * une adresse d'entreprise).
   */
  customerId: string | null;
  /** Ce qui a été encaissé, TVA comprise. */
  amountTotalCents: number;
  /** La TVA comprise dans le total. Sert à calculer la base HT. */
  amountTaxCents: number;
  /**
   * La référence qui identifie CE paiement, pour l'idempotence de la
   * commission affiliée.
   *
   * Le PaymentIntent d'abord (unique par encaissement, y compris sur les
   * échéances d'un abonnement), l'identifiant de session ensuite. Sans
   * elle, un réessai de Stripe créerait une deuxième commission pour la
   * même vente.
   */
  paymentRef: string | null;
}

/** Ce qu'on lit dans une session Stripe. Une seule forme, deux lecteurs. */
interface RawSession {
  id?: string;
  payment_status?: string;
  amount_total?: number | null;
  total_details?: { amount_tax?: number | null } | null;
  payment_intent?: string | null;
  customer?: string | { id?: string } | null;
  customer_details?: { email?: string | null; name?: string | null } | null;
  metadata?: Record<string, string> | null;
}

/**
 * La même traduction pour les deux lecteurs de session.
 *
 * Avant, chacun refaisait la sienne. C'est exactement comme ça qu'un
 * champ finit par exister d'un côté et pas de l'autre : le webhook de
 * remboursement et le webhook de paiement doivent voir la MÊME vente.
 */
function litSession(s: RawSession): OwnerSessionInfo {
  const meta = s.metadata ?? {};
  return {
    // `no_payment_required` couvre le cas d'un montant ramené à zéro par
    // un code promo : le client n'a rien payé et a pourtant droit à tout.
    paid: s.payment_status === "paid" || s.payment_status === "no_payment_required",
    email: s.customer_details?.email ?? null,
    name: s.customer_details?.name ?? null,
    productId: meta.product ?? null,
    affiliateRef: meta.affiliate_ref ?? null,
    freeMonthDays: Number(meta.free_month_days ?? 0) || 0,
    customerId: readCustomerId(s.customer),
    amountTotalCents: Number(s.amount_total ?? 0) || 0,
    amountTaxCents: Number(s.total_details?.amount_tax ?? 0) || 0,
    paymentRef: (typeof s.payment_intent === "string" ? s.payment_intent : "").trim() ||
      (s.id ?? "").trim() ||
      null,
  };
}

/**
 * Relit une session pour savoir ce qu'elle a vraiment payé.
 *
 * Sert à l'écran de retour (afficher le bon merci) ET au webhook (ouvrir
 * l'accès). **La source de vérité est `payment_status`**, jamais le fait
 * que l'acheteur soit arrivé sur la page de retour : cette adresse est
 * une URL comme une autre, quelqu'un peut l'ouvrir sans avoir payé.
 */
export async function retrieveOwnerSession(
  key: string,
  sessionId: string,
): Promise<OwnerSessionInfo | null> {
  try {
    const res = await fetch(
      `${STRIPE_API}/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
      { headers: { Authorization: `Bearer ${key}` } },
    );
    if (!res.ok) return null;
    return litSession((await res.json()) as RawSession);
  } catch {
    return null;
  }
}

/**
 * Retrouve la vente à partir du paiement qu'on vient de rembourser.
 *
 * L'événement `charge.refunded` ne porte ni notre `metadata[product]` ni
 * l'adresse saisie au moment de payer : il parle d'une charge, pas d'une
 * commande. Le seul fil qui relie les deux est le PaymentIntent, et
 * l'API sait lister les sessions qui en dépendent (paramètre
 * `payment_intent`).
 *
 * On pourrait se contenter de `billing_details.email` sur la charge,
 * mais c'est l'adresse de FACTURATION de la carte, pas forcément celle
 * du compte : on couperait alors l'accès de la mauvaise personne, ou de
 * personne. On remonte donc à la session, qui porte l'adresse qui a
 * réellement reçu les accès.
 */
export async function retrieveOwnerSessionByPaymentIntent(
  key: string,
  paymentIntentId: string,
): Promise<OwnerSessionInfo | null> {
  try {
    const res = await fetch(
      `${STRIPE_API}/v1/checkout/sessions?limit=1&payment_intent=${encodeURIComponent(paymentIntentId)}`,
      { headers: { Authorization: `Bearer ${key}` } },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: RawSession[] };
    const s = json.data?.[0];
    return s ? litSession(s) : null;
  } catch {
    return null;
  }
}

/**
 * L'ADRESSE DERRIÈRE UN ABONNEMENT.
 *
 * Un événement `customer.subscription.*` ne porte PAS d'adresse email :
 * il parle d'un abonnement, qui désigne un client par son identifiant.
 * Sans cet appel, on saurait qu'un abonnement s'arrête sans savoir de
 * qui il s'agit, donc sans pouvoir retirer le plan.
 *
 * C'est la même leçon que le remboursement du 20 août : la signature
 * prouve l'expéditeur, elle ne fournit pas la donnée qui manque. On va
 * la chercher.
 */
export async function retrieveOwnerCustomer(
  key: string,
  customerId: string,
): Promise<{ email: string | null; name: string | null } | null> {
  const id = String(customerId ?? "").trim();
  if (!id) return null;
  try {
    const res = await fetch(`${STRIPE_API}/v1/customers/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      email?: string | null;
      name?: string | null;
      deleted?: boolean;
    };
    // Un client supprimé chez Stripe ne renvoie plus que son id. On ne
    // fabrique pas une adresse : on répond qu'on ne sait pas.
    if (json.deleted) return null;
    return { email: json.email ?? null, name: json.name ?? null };
  } catch {
    return null;
  }
}

/**
 * Relit un abonnement chez Stripe.
 *
 * On relit au lieu de croire le corps reçu, pour la raison habituelle :
 * la signature prouve l'expéditeur, pas la FRAÎCHEUR de l'objet. Entre
 * l'envoi et le traitement, le client a pu annuler sa résiliation.
 */
export async function retrieveOwnerSubscription(
  key: string,
  subscriptionId: string,
): Promise<Record<string, unknown> | null> {
  const id = String(subscriptionId ?? "").trim();
  if (!id) return null;
  try {
    const res = await fetch(`${STRIPE_API}/v1/subscriptions/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}
