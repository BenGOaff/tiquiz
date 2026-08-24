// lib/affiliate/rattacherInscrit.ts
//
// UNE INSCRIPTION GRATUITE RATTACHE LA PERSONNE À SON AFFILIÉ, À VIE.
//
// Béné, 26 août 2026 : "s'il s'inscrit en free sur son lien : il reste
// son affilié à vie."
//
// -- LE TROU QUE ÇA BOUCHE ---------------------------------------------
//
// Cette règle ne marchait QUE via Systeme.io : leur optin appelle
// `sio-conversion` chez Tipote, qui écrit le rattachement. Notre propre
// inscription ne lisait ni le cookie, ni le `?ref=`, et n'écrivait rien.
//
// Un affilié qui envoyait quelqu'un sur NOS pages perdait donc son
// prospect à l'expiration du cookie : il avait fait le travail (amener
// l'inscrit) et ne touchait rien sur la vente qui arrivait trois mois
// plus tard. Et le problème grossit à chaque inscription prise chez
// nous, c'est à dire à mesure qu'on sort de Systeme.io.
//
// -- ELLE NE FAIT JAMAIS ÉCHOUER UNE INSCRIPTION -----------------------
//
// Le rattachement compte, l'inscription compte plus. Si Tipote ne répond
// pas, on CRIE et la personne entre quand même : un compte non créé est
// un client perdu tout de suite, un rattachement manquant se rattrape.

import "server-only";

import { readRef } from "@/lib/affiliate/refLien";
import { readSa } from "@/lib/affiliate/sa";

const ENDPOINT_PAR_DEFAUT = "https://app.tipote.com/api/affiliate/rattacher";

export async function rattacherInscrit(args: {
  email: string;
  /** Le code public de nos liens (`?ref=`), lu dans le cookie. */
  ref: string | null | undefined;
  /** Le `sa` des anciens liens Systeme.io, lu dans le cookie. */
  sa: string | null | undefined;
  pageUrl?: string | null;
}): Promise<void> {
  // Aucun lien affilié : c'est le cas NORMAL et le plus fréquent. On ne
  // fait pas d'aller-retour réseau pour rien.
  const ref = readRef(args.ref);
  const sa = readSa(args.sa);
  if (!ref && !sa) return;

  try {
    const secret = process.env.AFFILIATE_INTERNAL_SECRET?.trim();
    if (!secret) {
      console.error(
        "[rattacher] AFFILIATE_INTERNAL_SECRET absente : cette inscription ne rattache " +
          "personne, et l'affilie perdra la vente.",
      );
      return;
    }

    const url = process.env.TIPOTE_AFFILIATE_RATTACHER_ENDPOINT?.trim() || ENDPOINT_PAR_DEFAUT;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Affiliate-Secret": secret },
      // Comme la commission : cet appel tourne DANS la route
      // d'inscription, et la personne ne doit pas attendre Tipote.
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({ email: args.email, ref, sa, page_url: args.pageUrl ?? null }),
    });

    if (!res.ok) {
      console.error(
        `[rattacher] Tipote a refuse (${res.status}) pour ${args.email} : ` +
          `l'affilie ne sera pas paye sur ses achats futurs.`,
      );
      return;
    }
    const json = (await res.json().catch(() => ({}))) as { reason?: string; sa?: string };
    console.log(`[rattacher] ${args.email} : ${json.reason ?? "rattache"} ${json.sa ?? ""}`.trim());
  } catch (e) {
    console.error(
      `[rattacher] impossible pour ${args.email} : ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}
