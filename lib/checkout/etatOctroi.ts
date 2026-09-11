// lib/checkout/etatOctroi.ts
//
// TRADUIT LE RÉSULTAT DE `grantPlanByEmail` EN ÉTAT D'OCTROI, pour
// l'alerte d'accès (`lib/ventes/alerteAcces.ts`).
//
// Pur : il ne prend qu'un objet, il ne touche à rien. La règle qui
// compte est celle du `null` : `tagClientPose` vaut `null` quand aucun
// tag client ne s'applique (le plan gratuit a sa propre campagne), et
// « ne s'applique pas » n'est pas « a raté ». Lire ce `null` comme un
// échec ferait crier l'alerte sur chaque vente d'un plan sans tag
// client, et une alerte qui crie pour rien finit dans un filtre.

import type { GrantPlanResult } from "@/lib/checkout/grantPlan";
import type { EtatOctroi } from "@/lib/ventes/alerteAcces";

export function etatOctroiTiquiz(o: GrantPlanResult): EtatOctroi {
  if (!o.ok) return { ok: false, raison: o.reason ?? "grant_failed" };
  const tags: (boolean | null | undefined)[] = [o.tagPose, o.tagClientPose];
  const tagsPoses = tags.some((t) => t === false)
    ? false
    : tags.every((t) => t == null)
      ? null
      : true;
  return {
    ok: true,
    compteCree: o.created,
    emailAccesEnvoye: o.loginLinkSent ?? null,
    tagsPoses,
  };
}
