// lib/email/accesAlerte.ts
//
// L'ENVOI de l'alerte « paiement sans accès » / « accès incomplet ». La
// décision (faut-il alerter, quoi dire) vit dans
// `lib/ventes/alerteAcces.ts`, module pur, identique dans les deux
// dépôts ; ici on ne fait que le brancher sur Tiquiz.
//
// Best-effort : une alerte qui échoue ne change jamais la réponse au
// webhook, ni le 502 qui fait réessayer le fournisseur.

import "server-only";
import { resolveAppUrl } from "@/lib/authLinks";
import { alerteAccesNecessaire, contenuAlerteAcces, type AccesAlerte } from "@/lib/ventes/alerteAcces";
import { alerterAdmins } from "./alerteAdmin";

export type AccesAAlerter = Omit<AccesAlerte, "app" | "lienAdmin">;

export async function alerterAccesIncomplet(acces: AccesAAlerter): Promise<boolean> {
  try {
    if (!alerteAccesNecessaire(acces.octroi)) return false;
    const appUrl = resolveAppUrl(process.env.NEXT_PUBLIC_APP_URL);
    const contenu = contenuAlerteAcces({
      ...acces,
      app: "Tiquiz",
      lienAdmin: `${appUrl}/admin/clients/${encodeURIComponent(acces.email.trim().toLowerCase())}`,
    });
    return await alerterAdmins({
      subject: contenu.subject,
      html: contenu.html,
      text: contenu.texte,
      refId: "acces-incomplet",
    });
  } catch (e) {
    console.error(`[accesAlerte] ${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
}
