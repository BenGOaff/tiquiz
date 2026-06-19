// lib/resellerPayments.ts
//
// Connexion des comptes de paiement d'un revendeur (checkout natif).
// Le revendeur colle SA cle Stripe / SES identifiants PayPal. On verifie
// qu'ils marchent (appel reel a l'API du provider) AVANT de stocker, puis
// on les chiffre. Aucun secret ne quitte jamais le serveur en clair.
//
// Etape 1/2 : connexion + verification + statut. Le checkout proprement
// dit (creation des paiements, ouverture des acces) arrive en etape
// suivante et reutilisera loadResellerPaymentSecrets().

import { decryptSecret } from "@/lib/secretsCrypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export interface VerifyResult {
  ok: boolean;
  /** "live" | "test" (Stripe) ou "live" | "sandbox" (PayPal). */
  env?: string;
  /** Libelle d'affichage non sensible (email du compte, id masque...). */
  label?: string;
  error?: string;
}

const STRIPE_API = "https://api.stripe.com";
const PAYPAL_LIVE = "https://api-m.paypal.com";
const PAYPAL_SANDBOX = "https://api-m.sandbox.paypal.com";

function stripeEnvFromKey(key: string): string {
  if (key.includes("_live_")) return "live";
  if (key.includes("_test_")) return "test";
  return "unknown";
}

/**
 * Verifie une cle secrete Stripe (sk_live_/rk_live_ ou test). On tente
 * d'abord /v1/account (donne un libelle), sinon /v1/customers (au cas ou
 * la cle restreinte n'a pas le scope Account). 200 sur l'un des deux =
 * cle valide et utilisable.
 */
export async function verifyStripeKey(secret: string): Promise<VerifyResult> {
  const key = secret.trim();
  if (!/^(sk|rk)_(live|test)_[A-Za-z0-9]+$/.test(key)) {
    return { ok: false, error: "invalid_format" };
  }
  const env = stripeEnvFromKey(key);
  const headers = { Authorization: `Bearer ${key}` };

  try {
    const acc = await fetch(`${STRIPE_API}/v1/account`, { headers });
    if (acc.ok) {
      const data = (await acc.json()) as {
        id?: string;
        email?: string;
        business_profile?: { name?: string | null } | null;
      };
      const label =
        data.email || data.business_profile?.name || data.id || "Compte Stripe";
      return { ok: true, env, label };
    }
    // 401/403 : cle invalide OU restreinte sans scope Account. On tente
    // un endpoint que le checkout utilisera de toute facon.
    if (acc.status === 401) {
      return { ok: false, error: "unauthorized" };
    }
    const cust = await fetch(`${STRIPE_API}/v1/customers?limit=1`, { headers });
    if (cust.ok) {
      return { ok: true, env, label: "Compte Stripe" };
    }
    return { ok: false, error: cust.status === 401 ? "unauthorized" : "stripe_error" };
  } catch (e) {
    console.error("[resellerPayments] verifyStripeKey failed", (e as Error).message);
    return { ok: false, error: "network" };
  }
}

async function paypalToken(base: string, id: string, secret: string): Promise<boolean> {
  const auth = Buffer.from(`${id}:${secret}`).toString("base64");
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  return res.ok;
}

/**
 * Verifie un couple identifiants PayPal (client_id + secret d'une app
 * REST). On tente l'environnement live d'abord, puis sandbox, et on
 * memorise lequel a repondu.
 */
export async function verifyPaypalCreds(
  clientId: string,
  secret: string,
): Promise<VerifyResult> {
  const id = clientId.trim();
  const sec = secret.trim();
  if (id.length < 10 || sec.length < 10) {
    return { ok: false, error: "invalid_format" };
  }
  const last4 = id.slice(-4);
  try {
    if (await paypalToken(PAYPAL_LIVE, id, sec)) {
      return { ok: true, env: "live", label: `PayPal ****${last4}` };
    }
    if (await paypalToken(PAYPAL_SANDBOX, id, sec)) {
      return { ok: true, env: "sandbox", label: `PayPal ****${last4}` };
    }
    return { ok: false, error: "unauthorized" };
  } catch (e) {
    console.error("[resellerPayments] verifyPaypalCreds failed", (e as Error).message);
    return { ok: false, error: "network" };
  }
}

/** Base API PayPal pour un environnement donne (utilise au checkout). */
export function paypalApiBase(env: string | null | undefined): string {
  return env === "sandbox" ? PAYPAL_SANDBOX : PAYPAL_LIVE;
}

export interface ResellerPaymentSecrets {
  stripeKey: string | null;
  stripeEnv: string | null;
  paypalClientId: string | null;
  paypalSecret: string | null;
  paypalEnv: string | null;
}

/**
 * Charge et DECHIFFRE les secrets de paiement d'un revendeur (service-role
 * uniquement, jamais expose au client). Reserve au checkout natif.
 */
export async function loadResellerPaymentSecrets(
  resellerId: string,
): Promise<ResellerPaymentSecrets> {
  const { data, error } = await supabaseAdmin
    .from("resellers")
    .select(
      "stripe_secret_key_enc,stripe_env,paypal_client_id_enc,paypal_secret_enc,paypal_env",
    )
    .eq("id", resellerId)
    .maybeSingle();
  if (error || !data) {
    return {
      stripeKey: null,
      stripeEnv: null,
      paypalClientId: null,
      paypalSecret: null,
      paypalEnv: null,
    };
  }
  const safeDecrypt = (v: string | null): string | null => {
    if (!v) return null;
    try {
      return decryptSecret(v);
    } catch {
      console.error("[resellerPayments] decrypt failed (cle changee ?)");
      return null;
    }
  };
  return {
    stripeKey: safeDecrypt(data.stripe_secret_key_enc),
    stripeEnv: data.stripe_env ?? null,
    paypalClientId: safeDecrypt(data.paypal_client_id_enc),
    paypalSecret: safeDecrypt(data.paypal_secret_enc),
    paypalEnv: data.paypal_env ?? null,
  };
}
