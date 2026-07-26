// lib/sioWebhookSig.ts
// Vérification de signature HMAC-SHA256 des webhooks Systeme.io.
// Porté de Tiquiz / Tipote. SIO envoie un header X-Webhook-Signature
// (hex SHA256 HMAC du body, clé = secret par webhook).
//
// Opt-in : tant que SYSTEME_IO_WEBHOOK_SIGNING_SECRET n'est pas défini,
// la route accepte le shape `?secret=` existant. Une fois le signing
// secret configuré ET SIO qui envoie le header, on rejette toute
// requête sans signature valide.

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

export function verifySioSignature(rawBody: string, providedHeader: string | null): SignatureVerdict {
  if (!SIGNING_SECRET) return { ok: false, reason: "no_header" };
  if (!providedHeader) return { ok: false, reason: "no_header" };

  const provided = providedHeader.trim().toLowerCase();
  const computed = createHmac("sha256", SIGNING_SECRET).update(rawBody, "utf8").digest("hex");

  if (provided.length !== computed.length) return { ok: false, reason: "length_mismatch" };
  if (!hexEqual(provided, computed)) return { ok: false, reason: "mismatch" };
  return { ok: true };
}
