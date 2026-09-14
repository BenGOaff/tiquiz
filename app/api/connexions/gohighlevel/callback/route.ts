// app/api/connexions/gohighlevel/callback/route.ts
//
// LE RETOUR DE GOHIGHLEVEL, après que la personne a choisi son
// sous-compte ou son agence.
//
// L'échange du code demande `user_type`, et GoHighLevel ne dit pas dans
// l'adresse de retour lequel s'applique : on essaie "Location" d'abord
// (le cas d'un sous-compte, le plus fréquent), puis "Company". La
// réponse porte `userType`, `locationId` ou `companyId` : c'est ELLE
// qui dit ce qui a été installé, jamais une déduction de notre côté.
//
// Une installation d'AGENCE crée UNE ligne par sous-compte où l'app est
// installée, chacune avec le jeton d'agence et son `locationId` : un
// jeton de sous-compte se demande à chaque envoi (`jetonCourant`).
//
// Tout retour, réussi ou non, atterrit sur l'onglet Connexions avec un
// mot dans l'adresse (`ghl=ok|refuse|etat|erreur`) : une page blanche
// après un aller-retour chez un tiers est le pire écran possible.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { creerConnexion, echangerCodeGhl, sousComptesInstallesGhl, type SecretConnexion } from "@/lib/integrations/store";
import { validerCompteGhl } from "@/lib/integrations/adaptateurs/gohighlevel";
import { adresseDeRetourGhl, COOKIE_ETAT_GHL } from "../oauth/route";

export const dynamic = "force-dynamic";

function retour(req: NextRequest, mot: string, extra?: Record<string, string>): NextResponse {
  const url = new URL("/settings", req.nextUrl.origin);
  url.searchParams.set("tab", "connections");
  url.searchParams.set("ghl", mot);
  for (const [k, v] of Object.entries(extra ?? {})) url.searchParams.set(k, v);
  const res = NextResponse.redirect(url);
  res.cookies.set(COOKIE_ETAT_GHL, "", { path: "/api/connexions/gohighlevel", maxAge: 0 });
  return res;
}

export async function GET(req: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login?redirect=/settings?tab=connections", req.nextUrl.origin));

  const code = req.nextUrl.searchParams.get("code") ?? "";
  const state = req.nextUrl.searchParams.get("state") ?? "";
  const attendu = req.cookies.get(COOKIE_ETAT_GHL)?.value ?? "";
  if (!code || !state || !attendu || state !== attendu) return retour(req, "etat");

  const redirectUri = adresseDeRetourGhl(req);
  let r = await echangerCodeGhl(code, "Location", redirectUri);
  if (!r.ok || !r.data?.access_token) r = await echangerCodeGhl(code, "Company", redirectUri);
  if (!r.ok || !r.data?.access_token || !r.data.refresh_token) {
    console.error("[ghl/callback] echange du code refuse", r.status, r.erreur);
    return retour(req, "refuse");
  }
  const d = r.data;
  const access = d.access_token ?? "";
  const refresh = d.refresh_token ?? "";
  const expiresAt = Date.now() + Number(d.expires_in ?? 86_400) * 1000;

  try {
    if (String(d.userType ?? "").toLowerCase() === "company" || (!d.locationId && d.companyId)) {
      const companyId = String(d.companyId ?? "");
      const secret: SecretConnexion = { kind: "oauth-agence", access, refresh, expiresAt, companyId };
      const liste = await sousComptesInstallesGhl(access, companyId);
      if (!liste.ok || liste.locations.length === 0) {
        console.error("[ghl/callback] aucun sous-compte installe", liste.status, liste.erreur);
        return retour(req, "aucun_sous_compte");
      }
      let creees = 0;
      for (const l of liste.locations) {
        try {
          await creerConnexion({
            userId: user.id,
            fournisseur: "gohighlevel",
            nom: l.name || l.id,
            secret,
            config: { locationId: l.id, companyId, mode: "oauth", portee: "agence" },
          });
          creees++;
        } catch (e) {
          console.error("[ghl/callback] sous-compte non cree", l.id, e instanceof Error ? e.message : e);
        }
      }
      return retour(req, creees > 0 ? "ok" : "erreur", { n: String(creees) });
    }

    const locationId = String(d.locationId ?? "");
    if (!locationId) return retour(req, "refuse");
    const v = await validerCompteGhl({ token: access, locationId });
    if (!v.ok) {
      console.error("[ghl/callback] le jeton recu ne lit pas les contacts", v.status, v.erreur);
      return retour(req, "refuse");
    }
    await creerConnexion({
      userId: user.id,
      fournisseur: "gohighlevel",
      nom: `GoHighLevel ${locationId.slice(0, 6)}`,
      secret: { kind: "oauth-location", access, refresh, expiresAt },
      config: { locationId, companyId: d.companyId ?? null, mode: "oauth", portee: "sous-compte" },
    });
    return retour(req, "ok", { n: "1" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[ghl/callback]", msg);
    return retour(req, /duplicate|unique/i.test(msg) ? "deja" : "erreur");
  }
}
