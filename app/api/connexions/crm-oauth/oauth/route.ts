// app/api/connexions/crm-oauth/oauth/route.ts
//
// LE BOUTON "CONNECTER AVEC GOHIGHLEVEL" (Béné, 14 septembre 2026 :
// "on va faire comme eux", en montrant le parcours de Quizify).
//
// Ce que GoHighLevel fait de son côté : il affiche ses permissions, la
// personne choisit son sous-compte (ou son agence), et il revient sur
// `/api/connexions/crm-oauth/callback` avec un code. Le code s'échange
// contre un jeton d'accès et un jeton de rafraîchissement, rangés
// chiffrés (`lib/integrations/store.ts`).
//
// -- CE QU'IL FAUT CHEZ GOHIGHLEVEL, ET QUE LE CODE NE PEUT PAS FAIRE --
//
// Une app déclarée sur leur Marketplace (Developer), avec :
//   - les scopes : contacts.readonly, contacts.write, locations.readonly,
//     locations/tags.readonly ;
//   - l'adresse de retour EXACTE : <app>/api/connexions/crm-oauth/callback ;
//   - son Client ID et son Client Secret, posés dans le `.env` en
//     GHL_CLIENT_ID et GHL_CLIENT_SECRET (et GHL_APP_ID pour lister les
//     sous-comptes d'une agence).
// Sans ces trois variables, le bouton n'est PAS affiché (l'écran lit
// `oauth.gohighlevel` sur GET /api/connexions) : un bouton qui mène à
// une page d'erreur de GoHighLevel serait pire qu'un bouton absent. Le
// jeton privé collé à la main marche, lui, sans rien déclarer.
//
// -- POURQUOI `crm-oauth` ET PAS `gohighlevel` DANS L'ADRESSE ----------
//
// Mesuré le 14 septembre sur leur Marketplace : "The redirect uri
// contains a Highlevel reference. Please remove any Highlevel references
// to save." Une app white-label ne peut porter le nom de GoHighLevel ni
// dans sa fiche ni dans son adresse de retour. Le dossier s'appelle donc
// `crm-oauth` ; le fournisseur, lui, reste `gohighlevel` partout ailleurs
// (le catalogue, la table, la page d'aide), c'est un nom interne.
//
// -- LE `state` EST UN SECRET À USAGE UNIQUE ---------------------------
//
// Il est tiré au hasard, posé dans un cookie httpOnly, et comparé au
// retour : sans lui, n'importe quel site pourrait faire atterrir chez
// nous un code qui relie le compte Tiquiz de la personne au sous-compte
// GoHighLevel de quelqu'un d'autre. SameSite=Lax parce que le retour
// est une navigation de premier niveau (c'est exactement ce que Lax
// laisse passer, et ce que le cookie de reprise du 2 septembre fait).

import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { resolveAppUrl } from "@/lib/authLinks";
import { oauthGhlConfigure } from "@/lib/integrations/store";

export const dynamic = "force-dynamic";

export const GHL_OAUTH_SCOPES = "contacts.readonly contacts.write locations.readonly locations/tags.readonly";
export const COOKIE_ETAT_GHL = "tq_ghl_state";

export function adresseDeRetourGhl(req: NextRequest): string {
  return `${resolveAppUrl(process.env.NEXT_PUBLIC_APP_URL, req.nextUrl.origin)}/api/connexions/crm-oauth/callback`;
}

export async function GET(req: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  // Meme origine que l'adresse de retour envoyee a GoHighLevel : derriere le
  // proxy, `req.nextUrl.origin` vaut `localhost:3001` (drame du 14 septembre).
  const site = resolveAppUrl(process.env.NEXT_PUBLIC_APP_URL, req.nextUrl.origin);
  if (!user) return NextResponse.redirect(new URL("/login?redirect=/settings?tab=connections", site));
  if (!oauthGhlConfigure()) {
    return NextResponse.redirect(new URL("/settings?tab=connections&ghl=non_configure", site));
  }

  const state = randomBytes(24).toString("hex");
  const url = new URL("https://marketplace.gohighlevel.com/oauth/chooselocation");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", adresseDeRetourGhl(req));
  url.searchParams.set("client_id", process.env.GHL_CLIENT_ID ?? "");
  url.searchParams.set("scope", GHL_OAUTH_SCOPES);
  url.searchParams.set("state", state);

  const res = NextResponse.redirect(url);
  res.cookies.set(COOKIE_ETAT_GHL, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: req.nextUrl.protocol === "https:",
    path: "/api/connexions/crm-oauth",
    maxAge: 10 * 60,
  });
  return res;
}
