// lib/partner/tokens.ts
// Helpers de jetons pour le pont partenaire (FormaQuiz). Server-only.
// Les codes et tokens sont des secrets aleatoires ; on ne stocke que leur
// hash SHA-256 cote Tiquiz (le secret brut ne vit que chez FormaQuiz).
import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "crypto";

export function randomSecret(): string {
  return randomBytes(32).toString("hex");
}

export function hashSecret(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Comparaison a temps constant de deux chaines (anti timing attack). */
export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
