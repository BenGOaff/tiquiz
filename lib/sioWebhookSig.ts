// lib/sioWebhookSig.ts
// HMAC-SHA256 signature verification for SIO webhooks.
//
// Per https://developer.systeme.io/reference/webhooks SIO sends an
// X-Webhook-Signature header containing a hex SHA256 HMAC of the
// payload, keyed on a per-webhook secret. Verifying the signature
// closes the door on:
//   - URL secret leakage (?secret=… ending up in a Vercel access log)
//   - Replay-based attempts where an attacker steals a known-good URL
//     but can't forge a fresh body+signature pair
//
// We treat HMAC as OPT-IN: until SYSTEME_IO_WEBHOOK_SIGNING_SECRET is
// set, the webhook keeps accepting the existing `?secret=` shape so a
// rotation of SIO's webhook configuration isn't a hard cutover. Once
// the signing secret is configured AND SIO is firing the header, the
// route should hard-reject any request without a valid signature.
//
// Mirror of the Tipote helper at tipote-app/lib/sioWebhookSig.ts.

import { createHmac, timingSafeEqual } from "crypto";

const SIGNING_SECRET = (process.env.SYSTEME_IO_WEBHOOK_SIGNING_SECRET ?? "").trim();

export type SignatureMode =
  | { mode: "disabled" }
  | { mode: "required"; secret: string };

export function getSignatureMode(): SignatureMode {
  return SIGNING_SECRET ? { mode: "required", secret: SIGNING_SECRET } : { mode: "disabled" };
}

export type SignatureVerdict =
  | { ok: true }
  | { ok: false; reason: "no_header" | "length_mismatch" | "mismatch" };

function hexEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/**
 * Verify the X-Webhook-Signature header against the raw body bytes we
 * received. Returns ok:true on a match, otherwise a reason for logging.
 */
export function verifySioSignature(rawBody: string, providedHeader: string | null): SignatureVerdict {
  if (!SIGNING_SECRET) return { ok: false, reason: "no_header" };
  if (!providedHeader) return { ok: false, reason: "no_header" };

  const provided = providedHeader.trim().toLowerCase();
  const computed = createHmac("sha256", SIGNING_SECRET).update(rawBody, "utf8").digest("hex");

  if (provided.length !== computed.length) {
    if (process.env.SIO_WEBHOOK_DEBUG === "1") {
      console.warn("[SIO webhook] signature length mismatch", { provided_len: provided.length, computed_len: computed.length });
    }
    return { ok: false, reason: "length_mismatch" };
  }
  if (!hexEqual(provided, computed)) {
    if (process.env.SIO_WEBHOOK_DEBUG === "1") {
      console.warn("[SIO webhook] signature mismatch", { provided, computed });
    }
    return { ok: false, reason: "mismatch" };
  }
  return { ok: true };
}
