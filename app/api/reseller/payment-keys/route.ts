// app/api/reseller/payment-keys/route.ts
//
// Connexion des comptes de paiement du revendeur (checkout natif).
// Le revendeur colle SA cle Stripe / SES identifiants PayPal : on verifie
// par un appel reel au provider, puis on chiffre et on stocke. On ne
// renvoie JAMAIS un secret au client (que des statuts + libelles).
//
// A la connexion, Tiquiz cree AUSSI le webhook de cycle de vie dans le
// compte du revendeur (resiliations / echecs de paiement) : il n'a donc
// rien a cabler. A la deconnexion, on supprime ce webhook (best-effort).
//
// GET : statut de connexion Stripe / PayPal.
// PUT : { provider: "stripe", secret }
//       { provider: "paypal", client_id, secret }
//       { provider, disconnect: true }

import { NextRequest, NextResponse } from "next/server";

import { getResellerSession, logResellerAction } from "@/lib/reseller";
import {
  deletePaypalWebhook,
  ensurePaypalWebhook,
} from "@/lib/paypalRest";
import { logPaymentEvent } from "@/lib/resellerPaymentLog";
import {
  loadResellerPaymentSecrets,
  verifyPaypalCreds,
  verifyStripeKey,
} from "@/lib/resellerPayments";
import { deleteStripeWebhook, ensureStripeWebhook } from "@/lib/stripeRest";
import { encryptSecret, isSecretsCryptoConfigured } from "@/lib/secretsCrypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://quiz.tipote.com").trim();

interface StatusRow {
  stripe_secret_key_enc: string | null;
  stripe_env: string | null;
  stripe_account_label: string | null;
  paypal_client_id_enc: string | null;
  paypal_secret_enc: string | null;
  paypal_env: string | null;
  paypal_account_label: string | null;
}

function statusFromRow(row: StatusRow | null) {
  return {
    stripe: {
      connected: Boolean(row?.stripe_secret_key_enc),
      env: row?.stripe_env ?? null,
      label: row?.stripe_account_label ?? null,
    },
    paypal: {
      connected: Boolean(row?.paypal_client_id_enc && row?.paypal_secret_enc),
      env: row?.paypal_env ?? null,
      label: row?.paypal_account_label ?? null,
    },
  };
}

async function loadStatus(resellerId: string) {
  const { data } = await supabaseAdmin
    .from("resellers")
    .select(
      "stripe_secret_key_enc,stripe_env,stripe_account_label,paypal_client_id_enc,paypal_secret_enc,paypal_env,paypal_account_label",
    )
    .eq("id", resellerId)
    .maybeSingle();
  return statusFromRow((data as StatusRow) ?? null);
}

export async function GET() {
  const session = await getResellerSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    crypto_ready: isSecretsCryptoConfigured(),
    ...(await loadStatus(session.reseller.id)),
  });
}

export async function PUT(req: NextRequest) {
  const session = await getResellerSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!isSecretsCryptoConfigured()) {
    // Sans cle de chiffrement serveur, on REFUSE de stocker un secret.
    return NextResponse.json({ ok: false, error: "crypto_unavailable" }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const provider = String(body?.provider ?? "").toLowerCase();
  const resellerId = session.reseller.id;
  const token = session.reseller.webhook_token;

  if (provider !== "stripe" && provider !== "paypal") {
    return NextResponse.json({ ok: false, error: "invalid_provider" }, { status: 400 });
  }

  try {
    // ----- Deconnexion -----
    if (body?.disconnect === true) {
      // On supprime d'abord le webhook chez le provider (best-effort),
      // tant qu'on a encore les secrets.
      const secrets = await loadResellerPaymentSecrets(resellerId);
      const { data: ids } = await supabaseAdmin
        .from("resellers")
        .select("stripe_webhook_id,paypal_webhook_id")
        .eq("id", resellerId)
        .maybeSingle();

      if (provider === "stripe") {
        if (secrets.stripeKey && ids?.stripe_webhook_id) {
          await deleteStripeWebhook(secrets.stripeKey, ids.stripe_webhook_id);
        }
        const { error } = await supabaseAdmin
          .from("resellers")
          .update({
            stripe_secret_key_enc: null,
            stripe_env: null,
            stripe_account_label: null,
            stripe_price_ids: {},
            stripe_webhook_id: null,
            stripe_webhook_secret_enc: null,
          })
          .eq("id", resellerId);
        if (error) throw error;
      } else {
        if (
          secrets.paypalClientId &&
          secrets.paypalSecret &&
          ids?.paypal_webhook_id
        ) {
          await deletePaypalWebhook({
            clientId: secrets.paypalClientId,
            secret: secrets.paypalSecret,
            env: secrets.paypalEnv,
            webhookId: ids.paypal_webhook_id,
          });
        }
        const { error } = await supabaseAdmin
          .from("resellers")
          .update({
            paypal_client_id_enc: null,
            paypal_secret_enc: null,
            paypal_env: null,
            paypal_account_label: null,
            paypal_webhook_id: null,
          })
          .eq("id", resellerId);
        if (error) throw error;
      }

      await logResellerAction({
        resellerId,
        actorUserId: session.userId,
        action: `payment_disconnect_${provider}`,
        meta: {},
      });
      return NextResponse.json({ ok: true, ...(await loadStatus(resellerId)) });
    }

    // ----- Connexion Stripe -----
    if (provider === "stripe") {
      const secret = String(body?.secret ?? "").trim();
      if (!secret) {
        return NextResponse.json({ ok: false, error: "missing_secret" }, { status: 400 });
      }
      const check = await verifyStripeKey(secret);
      if (!check.ok) {
        return NextResponse.json({ ok: false, error: "stripe_invalid", detail: check.error });
      }
      // Webhook de cycle de vie (best-effort : la connexion reussit meme
      // si la creation echoue, le checkout marche sans).
      const wh = token
        ? await ensureStripeWebhook(secret, `${APP_URL}/api/payments/stripe/${token}`)
        : { ok: false as const };
      const { error } = await supabaseAdmin
        .from("resellers")
        .update({
          stripe_secret_key_enc: encryptSecret(secret),
          stripe_env: check.env ?? null,
          stripe_account_label: check.label ?? null,
          stripe_price_ids: {},
          stripe_webhook_id: wh.ok ? wh.id : null,
          stripe_webhook_secret_enc: wh.ok && wh.secret ? encryptSecret(wh.secret) : null,
        })
        .eq("id", resellerId);
      if (error) throw error;
      await logResellerAction({
        resellerId,
        actorUserId: session.userId,
        action: "payment_connect_stripe",
        meta: { env: check.env, webhook: wh.ok },
      });
      await logPaymentEvent({
        resellerId,
        provider: "stripe",
        stage: "connect",
        event: wh.ok ? "connect_stripe" : "connect_stripe_no_webhook",
        ok: wh.ok,
        detail: wh.ok
          ? `Stripe connecte (${check.env}).`
          : "Stripe connecte, mais le webhook n'a pas pu etre cree : les resiliations auto seront inactives. Reconnecte pour reessayer.",
      });
      return NextResponse.json({ ok: true, ...(await loadStatus(resellerId)) });
    }

    // ----- Connexion PayPal -----
    const clientId = String(body?.client_id ?? "").trim();
    const secret = String(body?.secret ?? "").trim();
    if (!clientId || !secret) {
      return NextResponse.json({ ok: false, error: "missing_secret" }, { status: 400 });
    }
    const check = await verifyPaypalCreds(clientId, secret);
    if (!check.ok) {
      return NextResponse.json({ ok: false, error: "paypal_invalid", detail: check.error });
    }
    const wh = token
      ? await ensurePaypalWebhook({
          clientId,
          secret,
          env: check.env ?? null,
          url: `${APP_URL}/api/payments/paypal/${token}`,
        })
      : { ok: false as const };
    const { error } = await supabaseAdmin
      .from("resellers")
      .update({
        paypal_client_id_enc: encryptSecret(clientId),
        paypal_secret_enc: encryptSecret(secret),
        paypal_env: check.env ?? null,
        paypal_account_label: check.label ?? null,
        paypal_webhook_id: wh.ok ? wh.id : null,
      })
      .eq("id", resellerId);
    if (error) throw error;
    await logResellerAction({
      resellerId,
      actorUserId: session.userId,
      action: "payment_connect_paypal",
      meta: { env: check.env, webhook: wh.ok },
    });
    await logPaymentEvent({
      resellerId,
      provider: "paypal",
      stage: "connect",
      event: wh.ok ? "connect_paypal" : "connect_paypal_no_webhook",
      ok: wh.ok,
      detail: wh.ok
        ? `PayPal connecte (${check.env}).`
        : "PayPal connecte, mais le webhook n'a pas pu etre cree : les resiliations auto seront inactives. Reconnecte pour reessayer.",
    });
    return NextResponse.json({ ok: true, ...(await loadStatus(resellerId)) });
  } catch (e) {
    console.error("[reseller/payment-keys] PUT failed", JSON.stringify(e));
    return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
  }
}
