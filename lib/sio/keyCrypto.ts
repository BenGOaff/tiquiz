// lib/sio/keyCrypto.ts
// AES-256-GCM envelope for Systeme.io API keys at rest.
//
// FORMAT — "v1.<iv_b64url>.<ciphertext_b64url>.<tag_b64url>"
//   - v1     version tag, lets us rotate algorithm without DB rewrites
//   - iv     12 random bytes (recommended GCM nonce length)
//   - ct     ciphertext bytes
//   - tag    16-byte GCM authentication tag
//
// MASTER KEY — env SIO_KEY_ENCRYPTION_KEY (base64-encoded 32 bytes).
// Generate with:  openssl rand -base64 32
//
// In dev, if the env is missing, we emit a one-time warning and use a
// deterministic dev key so localhost still works. In production, we
// throw so misconfiguration cannot silently store keys with a default key.

import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

const ALG = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;
const VERSION = "v1";

let warned = false;

function getMasterKey(): Buffer {
  const raw = process.env.SIO_KEY_ENCRYPTION_KEY;
  if (raw && raw.length > 0) {
    const buf = Buffer.from(raw, "base64");
    if (buf.length !== 32) {
      throw new Error(
        `SIO_KEY_ENCRYPTION_KEY must decode to 32 bytes (got ${buf.length}). ` +
          `Generate with: openssl rand -base64 32`,
      );
    }
    return buf;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SIO_KEY_ENCRYPTION_KEY env is required in production. " +
        "Generate with: openssl rand -base64 32",
    );
  }
  if (!warned) {
    warned = true;
    console.warn(
      "[sio/keyCrypto] SIO_KEY_ENCRYPTION_KEY missing — using DEV-ONLY fallback. " +
        "Do not use in production. Set the env to a 32-byte base64 value.",
    );
  }
  // Deterministic dev fallback. Anything stored with this key is NOT secure.
  return Buffer.from("tiquiz-dev-fallback-key-32-bytes!!".padEnd(32, "!")).subarray(0, 32);
}

function toB64Url(buf: Buffer): string {
  return buf.toString("base64url");
}

function fromB64Url(s: string): Buffer {
  return Buffer.from(s, "base64url");
}

export function encryptApiKey(plaintext: string): string {
  if (typeof plaintext !== "string" || plaintext.length === 0) {
    throw new Error("encryptApiKey: plaintext must be a non-empty string");
  }
  const key = getMasterKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALG, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, toB64Url(iv), toB64Url(ct), toB64Url(tag)].join(".");
}

export function decryptApiKey(envelope: string): string {
  if (typeof envelope !== "string" || !envelope.includes(".")) {
    throw new Error("decryptApiKey: invalid envelope");
  }
  const [version, ivB64, ctB64, tagB64] = envelope.split(".");
  if (version !== VERSION) {
    throw new Error(`decryptApiKey: unsupported version "${version}"`);
  }
  const key = getMasterKey();
  const iv = fromB64Url(ivB64);
  const ct = fromB64Url(ctB64);
  const tag = fromB64Url(tagB64);
  if (iv.length !== IV_LEN || tag.length !== TAG_LEN) {
    throw new Error("decryptApiKey: malformed envelope");
  }
  const decipher = createDecipheriv(ALG, key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString("utf8");
}

// Last 4 chars used for the UI "pk_live_••••3xy8" preview. Stored in clear
// alongside the ciphertext so listing keys never decrypts anything.
export function lastFour(plaintext: string): string {
  const trimmed = plaintext.trim();
  if (trimmed.length <= 4) return trimmed;
  return trimmed.slice(-4);
}
