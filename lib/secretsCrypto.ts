// lib/secretsCrypto.ts
//
// Chiffrement symetrique des secrets revendeur (cle Stripe, secret PayPal)
// avant stockage en base. AES-256-GCM : confidentialite + integrite
// (authTag). Un secret stocke est illisible sans RESELLER_SECRETS_KEY,
// meme si la ligne fuit (RLS, dump, etc.).
//
// RESELLER_SECRETS_KEY : 32 octets, fournie en hex (64 caracteres) OU en
// base64. A generer une fois et a poser dans .env du serveur prod :
//   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
// NE JAMAIS commiter cette valeur, NE JAMAIS la changer apres coup sans
// re-chiffrer les secrets existants (sinon ils deviennent indechiffrables).

import crypto from "node:crypto";

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const raw = process.env.RESELLER_SECRETS_KEY;
  if (!raw) {
    throw new Error("RESELLER_SECRETS_KEY manquante");
  }
  // 64 hex = 32 octets, sinon on tente le base64.
  const buf =
    /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (buf.length !== 32) {
    throw new Error("RESELLER_SECRETS_KEY doit faire 32 octets (64 hex ou base64)");
  }
  return buf;
}

/** True si la cle de chiffrement est configuree et valide. A appeler
 * avant d'exposer la fonctionnalite paiement pour eviter un 500 opaque. */
export function isSecretsCryptoConfigured(): boolean {
  try {
    getKey();
    return true;
  } catch {
    return false;
  }
}

/** Chiffre une chaine. Sortie : "ivB64:tagB64:cipherB64" (stockable en TEXT). */
export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(":");
}

/** Dechiffre une chaine produite par encryptSecret. Throw si la cle est
 * mauvaise ou la donnee alteree (authTag invalide). */
export function decryptSecret(payload: string): string {
  const parts = payload.split(":");
  if (parts.length !== 3) {
    throw new Error("secret chiffre malforme");
  }
  const [ivB64, tagB64, dataB64] = parts;
  const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
