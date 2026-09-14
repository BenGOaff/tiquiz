// app/api/connexions/crm-oauth/callback/route.ts
//
// LE RETOUR DE GOHIGHLEVEL, après que la personne a choisi son
// sous-compte ou son agence.
//
// DEUX CHEMINS Y MÈNENT (`lib/integrations/retourOauth.ts`) :
//   - notre bouton : le `state` est là, le code s'échange tout de suite ;
//   - une installation lancée chez GoHighLevel (lien de test, bouton
//     Install de leur Marketplace, installation d'agence) : pas de
//     `state`, le code est mis de côté dans un cookie et l'onglet
//     Connexions demande UN clic ("Relier ce sous-compte") avant
//     d'écrire quoi que ce soit. Ce clic est le POST ci dessous.
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
// mot dans l'adresse (`ghl=ok|refuse|etat|erreur|confirmer`) : une page
// blanche après un aller-retour chez un tiers est le pire écran possible.
//
// Sans session, on renvoie vers la connexion AVEC l'adresse complète
// (le code compris) : un client qui installe depuis GoHighLevel n'est
// pas forcément déjà connecté à Tiquiz, et perdre le code ici lui
// ferait recommencer chez eux sans savoir pourquoi.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { creerConnexion, echangerCodeGhl, sousComptesInstallesGhl, type SecretConnexion } from "@/lib/integrations/store";
import { validerCompteGhl } from "@/lib/integrations/adaptateurs/gohighlevel";
import { classerRetourOauth, COOKIE_CODE_GHL, DUREE_CODE_SECONDES } from "@/lib/integrations/retourOauth";
import { adresseDeRetourGhl, COOKIE_ETAT_GHL } from "../oauth/route";

export const dynamic = "force-dynamic";

const CHEMIN_COOKIES = "/api/connexions/crm-oauth";

function retour(req: NextRequest, mot: string, extra?: Record<string, string>): NextResponse {
  const url = new URL("/settings", req.nextUrl.origin);
  url.searchParams.set("tab", "connections");
  url.searchParams.set("ghl", mot);
  for (const [k, v] of Object.entries(extra ?? {})) url.searchParams.set(k, v);
  const res = NextResponse.redirect(url);
  res.cookies.set(COOKIE_ETAT_GHL, "", { path: CHEMIN_COOKIES, maxAge: 0 });
  return res;
}

function versLaConnexion(req: NextRequest): NextResponse {
  const cible = `${req.nextUrl.pathname}${req.nextUrl.search}`;
  return NextResponse.redirect(new URL(`/login?redirect=${encodeURIComponent(cible)}`, req.nextUrl.origin));
}

/**
 * Échange le code et enregistre ce que GoHighLevel a installé. Rend le
 * MOT que l'onglet Connexions traduit, et le nombre de connexions créées.
 * Une seule fonction pour les deux chemins : deux échanges écrits
 * séparément finiraient par ne plus ranger la même chose.
 */
async function relierAvecCode(userId: string, code: string, redirectUri: string): Promise<{ mot: string; n: number }> {
  let r = await echangerCodeGhl(code, "Location", redirectUri);
  if (!r.ok || !r.data?.access_token) r = await echangerCodeGhl(code, "Company", redirectUri);
  if (!r.ok || !r.data?.access_token || !r.data.refresh_token) {
    console.error("[ghl/callback] echange du code refuse", r.status, r.erreur);
    return { mot: "refuse", n: 0 };
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
        return { mot: "aucun_sous_compte", n: 0 };
      }
      let creees = 0;
      for (const l of liste.locations) {
        try {
          await creerConnexion({
            userId,
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
      return { mot: creees > 0 ? "ok" : "erreur", n: creees };
    }

    const locationId = String(d.locationId ?? "");
    if (!locationId) return { mot: "refuse", n: 0 };
    const v = await validerCompteGhl({ token: access, locationId });
    if (!v.ok) {
      console.error("[ghl/callback] le jeton recu ne lit pas les contacts", v.status, v.erreur);
      return { mot: "refuse", n: 0 };
    }
    await creerConnexion({
      userId,
      fournisseur: "gohighlevel",
      nom: `GoHighLevel ${locationId.slice(0, 6)}`,
      secret: { kind: "oauth-location", access, refresh, expiresAt },
      config: { locationId, companyId: d.companyId ?? null, mode: "oauth", portee: "sous-compte" },
    });
    return { mot: "ok", n: 1 };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[ghl/callback]", msg);
    return { mot: /duplicate|unique/i.test(msg) ? "deja" : "erreur", n: 0 };
  }
}

export async function GET(req: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return versLaConnexion(req);

  const code = req.nextUrl.searchParams.get("code") ?? "";
  const genre = classerRetourOauth({
    code,
    state: req.nextUrl.searchParams.get("state") ?? "",
    attendu: req.cookies.get(COOKIE_ETAT_GHL)?.value ?? "",
  });
  if (genre === "invalide") return retour(req, "etat");

  if (genre === "depuis-le-fournisseur") {
    // Rien n'est écrit ici : le code attend le clic "Relier" (POST).
    const res = retour(req, "confirmer");
    res.cookies.set(COOKIE_CODE_GHL, code, {
      httpOnly: true,
      sameSite: "lax",
      secure: req.nextUrl.protocol === "https:",
      path: CHEMIN_COOKIES,
      maxAge: DUREE_CODE_SECONDES,
    });
    return res;
  }

  const { mot, n } = await relierAvecCode(user.id, code, adresseDeRetourGhl(req));
  return retour(req, mot, { n: String(n) });
}

/** Le clic "Relier ce sous-compte" de l'onglet Connexions, pour une installation lancée chez GoHighLevel. */
export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, mot: "erreur" }, { status: 401 });

  const code = req.cookies.get(COOKIE_CODE_GHL)?.value ?? "";
  const efface = (res: NextResponse) => {
    res.cookies.set(COOKIE_CODE_GHL, "", { path: CHEMIN_COOKIES, maxAge: 0 });
    return res;
  };
  if (classerRetourOauth({ code, state: "", attendu: "" }) !== "depuis-le-fournisseur") {
    return efface(NextResponse.json({ ok: false, mot: "expire", n: 0 }));
  }
  const { mot, n } = await relierAvecCode(user.id, code, adresseDeRetourGhl(req));
  return efface(NextResponse.json({ ok: mot === "ok", mot, n }));
}
