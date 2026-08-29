// app/api/admin/pilotage/parametres/route.ts
//
// CE QUE LE PROCESSUS A VRAIMENT SOUS LA MAIN.
//
// `npm run check:prod` lit le `.env` du dépôt. Cette route lit le
// PROCESSUS, et ce n'est pas la même question : le 22 août, les deux
// `.env` étaient justes et les deux apps servaient quand même la base de
// l'autre, parce que `pm2 restart --update-env` avait poussé un terminal
// pollué dans le processus. Un contrôle qui lit le fichier ne voit pas
// ça.
//
// ELLE NE REND JAMAIS UNE VALEUR SECRÈTE. `lireReglages` s'en charge, et
// un test l'exige : cette réponse finit dans un onglet réseau, parfois
// dans un copier-coller.

import { NextResponse } from "next/server";

import { isAdminEmail } from "@/lib/adminEmails";
import { lireCleSupabase, refDepuisUrl } from "@/lib/env/supabaseProject";
import {
  contradictions,
  lireReglages,
  modePaypal,
  modeStripe,
} from "@/lib/pilotage/parametres";
import {
  lireReponse,
  phraseCle,
  trierCles,
  type EtatCle,
  type ResultatCle,
} from "@/lib/pilotage/sondesCles";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Ce qu'on accepte d'attendre d'un fournisseur. Au delà, on le DIT. */
const DELAI_SONDE_MS = 6000;

/**
 * Une sonde : on demande au service, on lit ce qu'il répond.
 *
 * Elle ne jette JAMAIS. Un écran de diagnostic qui tombe parce qu'un
 * fournisseur est en panne serait une plaisanterie : c'est précisément
 * le moment où on l'ouvre.
 */
async function sonder(
  service: string,
  variable: string,
  cle: string,
  appel: () => Promise<Response>,
): Promise<ResultatCle> {
  if (!cle) {
    return { service, variable, etat: "absente", detail: phraseCle(service, "absente", variable) };
  }
  let etat: EtatCle;
  try {
    etat = lireReponse((await appel()).status);
  } catch {
    etat = "injoignable";
  }
  return { service, variable, etat, detail: phraseCle(service, etat, variable) };
}

function get(url: string, entetes: Record<string, string>): Promise<Response> {
  return fetch(url, {
    headers: entetes,
    cache: "no-store",
    signal: AbortSignal.timeout(DELAI_SONDE_MS),
  });
}

/**
 * TOUTES LES SONDES, EN PARALLÈLE.
 *
 * Chacune vise le point d'entrée qui répond à SA question. Le 22 août,
 * une heure a été perdue parce qu'un test tapait sur `/rest/v1/`, qui
 * répond 200 à n'importe quelle clé valide du projet quel que soit son
 * rôle : un test qui ne distingue pas ce qu'il est censé distinguer est
 * pire qu'un test absent.
 *
 * AUCUNE N'ÉCRIT et aucune ne coûte : que des lectures.
 */
async function sonderTout(env: NodeJS.ProcessEnv): Promise<ResultatCle[]> {
  const v = (n: string) => String(env[n] ?? "").trim();
  const supabaseUrl = v("NEXT_PUBLIC_SUPABASE_URL").replace(/\/+$/, "");
  const stripe = v("STRIPE_SECRET_KEY_OWNER");
  const paypalId = v("PAYPAL_CLIENT_ID_OWNER");
  const paypalSecret = v("PAYPAL_SECRET_OWNER");
  const paypalLive = v("PAYPAL_ENV_OWNER").toLowerCase() === "live";
  const paypalHote = paypalLive
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

  return Promise.all([
    // LA CLÉ DE SERVICE : `/auth/v1/admin/...` est le seul point qu'une
    // clé anon n'a PAS le droit de lire. C'est ce qui distingue.
    sonder(
      "Supabase (clé de service)",
      "SUPABASE_SERVICE_ROLE_KEY",
      supabaseUrl ? v("SUPABASE_SERVICE_ROLE_KEY") : "",
      () =>
        get(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1`, {
          apikey: v("SUPABASE_SERVICE_ROLE_KEY"),
          Authorization: `Bearer ${v("SUPABASE_SERVICE_ROLE_KEY")}`,
        }),
    ),
    // Stripe : lire le solde ne crée rien et ne coûte rien, et une clé
    // restreinte sans ce droit répondra 403, ce qui est aussi une
    // information (la clé existe mais ne peut pas travailler).
    sonder("Stripe", "STRIPE_SECRET_KEY_OWNER", stripe, () =>
      get("https://api.stripe.com/v1/balance", { Authorization: `Bearer ${stripe}` }),
    ),
    // Resend : la liste des domaines, en lecture seule. Surtout PAS un
    // envoi de test : un diagnostic ne doit pas poster de courrier.
    sonder("Resend (emails)", "RESEND_API_KEY", v("RESEND_API_KEY"), () =>
      get("https://api.resend.com/domains", { Authorization: `Bearer ${v("RESEND_API_KEY")}` }),
    ),
    // PayPal : demander un jeton, c'est exactement ce que fait le
    // paiement au premier appel. Et on tape sur l'hôte du MODE déclaré :
    // des identifiants réels envoyés au bac à sable sont refusés avec un
    // message qui ne dit pas pourquoi.
    sonder(
      `PayPal (${paypalLive ? "réel" : "bac à sable"})`,
      "PAYPAL_CLIENT_ID_OWNER",
      paypalId && paypalSecret ? paypalId : "",
      () =>
        fetch(`${paypalHote}/v1/oauth2/token`, {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`${paypalId}:${paypalSecret}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: "grant_type=client_credentials",
          cache: "no-store",
          signal: AbortSignal.timeout(DELAI_SONDE_MS),
        }),
    ),
  ]);
}

export async function GET(): Promise<NextResponse> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }

  const env = process.env;
  const lecture = lireCleSupabase(String(env.SUPABASE_SERVICE_ROLE_KEY ?? ""));

  // LES SONDES : est-ce que la clé RÉPOND. C'est la seule information
  // qu'un `grep` dans le .env ne donne pas, et c'est celle qui a coûté
  // une journée le 22 août et un client le 7 août.
  const cles = trierCles(await sonderTout(env));

  return NextResponse.json({
    ok: true,
    cles,
    reglages: lireReglages(env),
    contradictions: contradictions(env),
    // Un MODE et un identifiant de projet ne sont pas des secrets, et ce
    // sont eux qui rendent un diagnostic évident.
    stripe: modeStripe(env.STRIPE_SECRET_KEY_OWNER),
    paypal: modePaypal(env.PAYPAL_ENV_OWNER),
    supabase: {
      refUrl: refDepuisUrl(String(env.NEXT_PUBLIC_SUPABASE_URL ?? "")),
      refCle: lecture.etat === "jwt" ? lecture.ref : null,
      cleLisible: lecture.etat,
    },
  });
}
