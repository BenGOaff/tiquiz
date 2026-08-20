// lib/sales/previewGate.ts
//
// LA PORTE DU CHANTIER DE VENTE.
//
// La page de vente et le bon de commande sont servis par notre serveur
// bien avant d'être annoncés. Tant que Béné n'a pas dit "on ouvre", ils
// n'existent que pour elle, et l'unique clé d'entrée est `?k=`.
//
// -- POURQUOI CETTE PORTE VIT ICI ET PLUS DANS LA ROUTE ----------------
//
// Elle était écrite dans `app/apercu/vente/[slug]/route.ts`. Le bon de
// commande en a besoin aussi, et la recopier aurait été la millième
// occurrence du même défaut : deux copies d'une décision divergent, on en
// corrige une, et le trou ne se voit que le jour où quelqu'un passe par
// la porte qu'on avait oubliée. Ici, une seule porte pour les deux.
//
// -- L'ABSENCE FERME ---------------------------------------------------
//
// Pas de variable, variable trop courte, clé absente ou fausse : 404.
// Un `.env` oublié ne peut pas publier une page en chantier. Et 404
// plutôt que 403 : un refus explicite annoncerait qu'il y a quelque chose
// derrière.

import { timingSafeEqual } from "node:crypto";

/** D'où on lit les variables. Voir `lib/checkout/ownerAccount.ts`. */
export type EnvSource = Readonly<Record<string, string | null | undefined>>;

/**
 * La longueur minimale d'une clé utilisable.
 *
 * Une clé de 4 caractères se devine ; une variable posée à moitié
 * (`SALES_PREVIEW_TOKEN=`) vaut chaîne vide. Les deux doivent fermer, pas
 * ouvrir.
 */
const LONGUEUR_MINIMALE = 16;

/** La clé attendue, ou `null` si rien d'utilisable n'est posé. */
export function readSalesPreviewToken(env: EnvSource): string | null {
  const attendue = String(env.SALES_PREVIEW_TOKEN ?? "").trim();
  return attendue.length >= LONGUEUR_MINIMALE ? attendue : null;
}

/** Comparaison à durée constante : une clé ne se devine pas à la montre. */
function memeCle(recue: string, attendue: string): boolean {
  const a = Buffer.from(recue);
  const b = Buffer.from(attendue);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Cette clé ouvre-t-elle le chantier ?
 *
 * `recue` est la valeur du `?k=`. La fonction ne lit pas la requête
 * elle-même : elle reste pure, donc testable, et l'appelant décide d'où
 * vient la clé (query string aujourd'hui, corps d'un POST pour le bon de
 * commande).
 */
export function isSalesPreviewOpen(recue: string | null | undefined, env: EnvSource): boolean {
  const attendue = readSalesPreviewToken(env);
  if (!attendue) {
    console.warn(
      "[chantier vente] SALES_PREVIEW_TOKEN absent ou trop court : la porte reste fermee.",
    );
    return false;
  }
  const propre = String(recue ?? "").trim();
  if (!propre) return false;
  return memeCle(propre, attendue);
}
