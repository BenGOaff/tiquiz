// lib/checkout/billingPortal.ts
//
// L'ABONNÉ GÈRE SA CARTE LUI MÊME.
//
// Béné, 21 août : "on peut aussi permettre aux users de modifier leur
// mode de paiement ? Genre ils veulent payer avec une autre carte ?"
//
// -- ON NE CONSTRUIT PAS ÇA, ET C'EST LA BONNE DÉCISION ----------------
//
// Un formulaire de carte chez nous voudrait dire : gérer la conformité
// PCI, l'authentification forte de la banque (3D Secure), les cartes
// expirées, les erreurs de la banque en sept langues, et refaire tout ça
// à chaque évolution des règles européennes. Pour un résultat moins bon
// que ce que Stripe livre déjà.
//
// Le PORTAIL CLIENT de Stripe fait exactement ce qu'elle demande, et
// plus : changer de carte, télécharger ses factures, voir sa prochaine
// échéance, résilier. Il parle français, il est aux couleurs qu'on règle
// dans le tableau de bord, et il est à jour tout seul.
//
// Notre travail se réduit donc à une chose : dire à Stripe DE QUI on
// parle, et où renvoyer la personne quand elle a fini.
//
// -- CE QUI MANQUAIT, ET QUI EXPLIQUE QUE ÇA N'EXISTAIT PAS ------------
//
// On encaissait, on ouvrait le plan, et on JETAIT l'identifiant du client
// Stripe. Sans lui, aucun portail n'est ouvrable. D'où la colonne
// `profiles.stripe_customer_id` (migration 20260821_stripe_customer.sql)
// et la capture dans le webhook.
//
// -- LA LIMITE, ET IL FAUT LA DIRE -------------------------------------
//
// Le portail ne connaît que les abonnements pris SUR NOTRE bon de
// commande. Les clients arrivés par Systeme.io ont leur abonnement chez
// Systeme.io : leur carte se change là-bas, et le bouton ne doit pas
// leur être proposé. C'est pour ça que l'écran le montre uniquement si
// l'identifiant existe, plutôt que de mener tout le monde vers une page
// d'erreur.

const STRIPE_API = "https://api.stripe.com";

export type PortalFailure = "not_configured" | "no_customer" | "stripe_refused" | "network";

export interface PortalResult {
  ok: boolean;
  url?: string;
  reason?: PortalFailure;
  /** Le message brut de Stripe, pour le journal. JAMAIS affiché. */
  detail?: string;
}

/**
 * Reconnaît le refus "le portail n'est pas configuré".
 *
 * Stripe exige qu'une configuration par défaut existe dans le tableau de
 * bord avant d'accepter la moindre session de portail. Tant qu'elle n'y
 * est pas, il répond une erreur qui ressemble à une panne alors que ça
 * se règle en deux clics. Même règle que Stripe Tax sur le bon de
 * commande : on traduit le refus en quelque chose d'actionnable au lieu
 * de le laisser passer pour un bug.
 */
export function looksLikePortalNotConfigured(message: string | null | undefined): boolean {
  const m = String(message ?? "").toLowerCase();
  if (!m) return false;
  return (
    m.includes("no configuration provided") ||
    m.includes("default configuration has not been created") ||
    (m.includes("customer portal") && m.includes("configuration"))
  );
}

/**
 * Ouvre une session de portail et rend l'adresse où envoyer la personne.
 *
 * Le lien est à USAGE UNIQUE et de courte durée : on ne le stocke pas,
 * on ne le met pas dans un email, on redirige tout de suite.
 */
export async function createBillingPortalSession(args: {
  key: string;
  customerId: string;
  /** Où Stripe ramène la personne quand elle ferme le portail. */
  returnUrl: string;
  /** La langue du portail. */
  locale?: string;
}): Promise<PortalResult> {
  const customer = String(args.customerId ?? "").trim();
  if (!customer) return { ok: false, reason: "no_customer" };

  const corps = new URLSearchParams({
    customer,
    return_url: args.returnUrl,
  });
  // Stripe attend un code court (`fr`, `en`), pas un `fr-FR`. Une valeur
  // qu'il ne connaît pas ferait échouer toute la session pour une raison
  // cosmétique : dans le doute on ne l'envoie pas et il choisit d'après
  // le navigateur.
  const langue = String(args.locale ?? "").trim().slice(0, 2).toLowerCase();
  if (/^[a-z]{2}$/.test(langue)) corps.set("locale", langue);

  try {
    const res = await fetch(`${STRIPE_API}/v1/billing_portal/sessions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: corps.toString(),
    });
    const json = (await res.json()) as { url?: string; error?: { message?: string } };
    if (!res.ok || !json.url) {
      const detail = json.error?.message ?? `HTTP ${res.status}`;
      return {
        ok: false,
        reason: looksLikePortalNotConfigured(detail) ? "not_configured" : "stripe_refused",
        detail,
      };
    }
    return { ok: true, url: json.url };
  } catch (e) {
    return { ok: false, reason: "network", detail: e instanceof Error ? e.message : String(e) };
  }
}
